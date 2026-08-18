import {
  PublicCorePostgresError,
  type PublicCoreCanonicalSqlStatementV1,
  type PublicCoreSqlExecutorV1,
  type PublicCoreSqlQueryResultV1,
  type PublicCoreSqlTransactionV1,
  type PublicCoreSqlValueV1,
} from "./public-core-postgres.ts";

export const PUBLIC_CORE_PG_EXECUTOR_ERROR_SCHEMA_VERSION =
  "r4.public-core-pg-executor-error.v1" as const;

export type PublicCorePgExecutorErrorCodeV1 =
  | "public_core_pg_begin_failed"
  | "public_core_pg_callback_failed"
  | "public_core_pg_client_invalid"
  | "public_core_pg_commit_ambiguous"
  | "public_core_pg_configuration_invalid"
  | "public_core_pg_connect_failed"
  | "public_core_pg_protocol_violation"
  | "public_core_pg_query_failed"
  | "public_core_pg_query_result_invalid"
  | "public_core_pg_release_failed"
  | "public_core_pg_rollback_failed";

export type PublicCorePgExecutorErrorPhaseV1 =
  | "begin"
  | "callback"
  | "client"
  | "commit"
  | "configuration"
  | "connect"
  | "query"
  | "release"
  | "rollback";

export type PublicCorePgExecutorTransactionOutcomeV1 =
  | "not_started"
  | "rolled_back"
  | "committed"
  | "ambiguous";

export interface PublicCorePgExecutorErrorDetailsV1 {
  readonly schemaVersion: typeof PUBLIC_CORE_PG_EXECUTOR_ERROR_SCHEMA_VERSION;
  readonly status: 503;
  readonly code: PublicCorePgExecutorErrorCodeV1;
  readonly phase: PublicCorePgExecutorErrorPhaseV1;
  readonly transactionOutcome: PublicCorePgExecutorTransactionOutcomeV1;
}

/**
 * The public error surface contains fixed, body-free values only. The private
 * WeakMap below is the authenticity boundary; calling the public constructor
 * does not mint an authentic executor error.
 */
export class PublicCorePgExecutorErrorV1 extends Error {
  readonly status = 503 as const;
  readonly code: PublicCorePgExecutorErrorCodeV1;

  constructor(code: PublicCorePgExecutorErrorCodeV1) {
    super(code);
    this.name = "PublicCorePgExecutorErrorV1";
    this.code = code;
  }

  toJSON(): Readonly<{
    name: "PublicCorePgExecutorErrorV1";
    status: 503;
    code: PublicCorePgExecutorErrorCodeV1;
  }> {
    return Object.freeze({ name: "PublicCorePgExecutorErrorV1", status: 503, code: this.code });
  }
}

const AUTHENTIC_EXECUTOR_ERRORS = new WeakSet<PublicCorePgExecutorErrorV1>();
const EXECUTOR_ERROR_DETAILS = new WeakMap<
  PublicCorePgExecutorErrorV1,
  PublicCorePgExecutorErrorDetailsV1
>();

/** Inspect an executor error without trusting its public prototype or fields. */
export function authenticPublicCorePgExecutorErrorDetails(
  error: unknown,
): PublicCorePgExecutorErrorDetailsV1 | null {
  try {
    if (
      (typeof error !== "object" && typeof error !== "function")
      || error === null
      || !AUTHENTIC_EXECUTOR_ERRORS.has(error as PublicCorePgExecutorErrorV1)
      || !Object.isFrozen(error)
    ) return null;
    return EXECUTOR_ERROR_DETAILS.get(error as PublicCorePgExecutorErrorV1) ?? null;
  } catch {
    return null;
  }
}

function executorError(
  code: PublicCorePgExecutorErrorCodeV1,
  phase: PublicCorePgExecutorErrorPhaseV1,
  transactionOutcome: PublicCorePgExecutorTransactionOutcomeV1,
): PublicCorePgExecutorErrorV1 {
  const error = new PublicCorePgExecutorErrorV1(code);
  const details = Object.freeze({
    schemaVersion: PUBLIC_CORE_PG_EXECUTOR_ERROR_SCHEMA_VERSION,
    status: 503 as const,
    code,
    phase,
    transactionOutcome,
  });
  AUTHENTIC_EXECUTOR_ERRORS.add(error);
  EXECUTOR_ERROR_DETAILS.set(error, details);
  Object.freeze(error);
  return error;
}

function throwExecutorError(
  code: PublicCorePgExecutorErrorCodeV1,
  phase: PublicCorePgExecutorErrorPhaseV1,
  transactionOutcome: PublicCorePgExecutorTransactionOutcomeV1,
): never {
  throw executorError(code, phase, transactionOutcome);
}

interface CapturedMethodV1 {
  readonly receiver: object;
  readonly method: (...args: readonly unknown[]) => unknown;
}

/** A real pg.Pool is structurally assignable; no driver constructor is owned here. */
export interface PublicCorePgPoolV1 {
  connect(): unknown;
}

export interface PublicCorePgExecutorConfigV1 {
  readonly pool: PublicCorePgPoolV1;
}

interface StatementSnapshotV1 {
  readonly text: string;
  readonly values: readonly PublicCoreSqlValueV1[];
  readonly rowKeys: readonly string[];
}

const STATEMENT_STRING_KEYS = Object.freeze([
  "action",
  "lockClass",
  "payloadClass",
  "phase",
  "rowExpectation",
  "rowKeys",
  "statementId",
  "text",
  "values",
] as const);

const ERROR_CODE = /^[a-z][a-z0-9_]{0,127}$/u;
const ROW_KEY = /^[a-z][a-z0-9_]{0,127}$/u;
const MAX_ARRAY_ITEMS = 4_096;
const MAX_OBJECT_KEYS = 256;
const MAX_SNAPSHOT_DEPTH = 12;

function sameKeys(actual: readonly string[], expected: readonly string[]): boolean {
  if (actual.length !== expected.length) return false;
  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();
  return sortedActual.every((key, index) => key === sortedExpected[index]);
}

function capturedMethod(source: unknown, name: string): CapturedMethodV1 {
  if ((typeof source !== "object" && typeof source !== "function") || source === null) {
    throw new TypeError("invalid_method_receiver");
  }
  const receiver = source as object;
  let cursor: object | null = receiver;
  const seen = new Set<object>();
  for (let depth = 0; cursor !== null && depth < 16; depth += 1) {
    if (seen.has(cursor)) throw new TypeError("cyclic_method_prototype");
    seen.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, name);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, "value") || typeof descriptor.value !== "function") {
        throw new TypeError("invalid_method_descriptor");
      }
      return Object.freeze({
        receiver,
        method: descriptor.value as (...args: readonly unknown[]) => unknown,
      });
    }
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  throw new TypeError("method_missing");
}

function invokeCaptured(port: CapturedMethodV1, args: readonly unknown[]): unknown {
  return Reflect.apply(port.method, port.receiver, args);
}

function exactOwnDataDescriptors(
  source: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, PropertyDescriptor>> {
  if ((typeof source !== "object" && typeof source !== "function") || source === null) {
    throw new TypeError("invalid_descriptor_source");
  }
  const prototype = Object.getPrototypeOf(source) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("invalid_descriptor_prototype");
  }
  const descriptors = Object.getOwnPropertyDescriptors(source);
  if (Reflect.ownKeys(descriptors).some((key) => typeof key === "symbol")) {
    throw new TypeError("invalid_descriptor_symbols");
  }
  const keys = Object.keys(descriptors);
  if (!sameKeys(keys, expectedKeys)) throw new TypeError("invalid_descriptor_keys");
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (!descriptor || !Object.hasOwn(descriptor, "value") || descriptor.enumerable !== true) {
      throw new TypeError("invalid_data_descriptor");
    }
  }
  return descriptors;
}

function snapshotConfig(source: unknown): CapturedMethodV1 {
  try {
    const descriptors = exactOwnDataDescriptors(source, ["pool"]);
    return capturedMethod(descriptors.pool?.value, "connect");
  } catch {
    throwExecutorError(
      "public_core_pg_configuration_invalid",
      "configuration",
      "not_started",
    );
  }
}

function snapshotOptions(
  source: unknown,
): Readonly<{ isolation: "read_committed"; readOnly: boolean }> {
  try {
    const descriptors = exactOwnDataDescriptors(source, ["isolation", "readOnly"]);
    const isolation = descriptors.isolation?.value;
    const readOnly = descriptors.readOnly?.value;
    if (isolation !== "read_committed" || typeof readOnly !== "boolean") {
      throw new TypeError("invalid_transaction_options");
    }
    return Object.freeze({ isolation, readOnly });
  } catch (error) {
    const details = authenticPublicCorePgExecutorErrorDetails(error);
    if (details !== null) throw error;
    throwExecutorError(
      "public_core_pg_configuration_invalid",
      "configuration",
      "not_started",
    );
  }
}

function dataSnapshot(
  source: unknown,
  allowDate: boolean,
  seen = new Set<object>(),
  depth = 0,
): unknown {
  if (
    source === null
    || typeof source === "string"
    || typeof source === "boolean"
    || typeof source === "bigint"
  ) return source;
  if (typeof source === "number") {
    if (!Number.isFinite(source)) throw new TypeError("invalid_snapshot_number");
    return source;
  }
  if (typeof source !== "object" || depth > MAX_SNAPSHOT_DEPTH) {
    throw new TypeError("invalid_snapshot_value");
  }
  if (seen.has(source)) throw new TypeError("cyclic_snapshot_value");
  seen.add(source);
  try {
    const prototype = Object.getPrototypeOf(source) as unknown;
    if (allowDate && prototype === Date.prototype) {
      const milliseconds = Reflect.apply(Date.prototype.getTime, source, []) as number;
      if (!Number.isFinite(milliseconds)) throw new TypeError("invalid_snapshot_date");
      return new Date(milliseconds).toISOString();
    }
    if (Array.isArray(source)) {
      if (prototype !== Array.prototype) throw new TypeError("invalid_snapshot_array_prototype");
      const descriptors = Object.getOwnPropertyDescriptors(source) as unknown as Record<
        PropertyKey,
        PropertyDescriptor
      >;
      if (Reflect.ownKeys(descriptors).some((key) => typeof key === "symbol")) {
        throw new TypeError("invalid_snapshot_array_symbols");
      }
      const lengthDescriptor = descriptors.length;
      if (
        !lengthDescriptor
        || !Object.hasOwn(lengthDescriptor, "value")
        || !Number.isSafeInteger(lengthDescriptor.value)
        || (lengthDescriptor.value as number) < 0
        || (lengthDescriptor.value as number) > MAX_ARRAY_ITEMS
      ) throw new TypeError("invalid_snapshot_array_length");
      const length = lengthDescriptor.value as number;
      const expectedKeys = ["length", ...Array.from({ length }, (_, index) => String(index))];
      if (!sameKeys(Object.keys(descriptors), expectedKeys)) {
        throw new TypeError("invalid_snapshot_array_keys");
      }
      const owned: unknown[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !Object.hasOwn(descriptor, "value") || descriptor.enumerable !== true) {
          throw new TypeError("invalid_snapshot_array_descriptor");
        }
        owned.push(dataSnapshot(descriptor.value, allowDate, seen, depth + 1));
      }
      return Object.freeze(owned);
    }
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("invalid_snapshot_object_prototype");
    }
    const descriptors = Object.getOwnPropertyDescriptors(source) as Record<
      PropertyKey,
      PropertyDescriptor
    >;
    if (Reflect.ownKeys(descriptors).some((key) => typeof key === "symbol")) {
      throw new TypeError("invalid_snapshot_object_symbols");
    }
    const keys = Object.keys(descriptors);
    if (keys.length > MAX_OBJECT_KEYS) throw new TypeError("invalid_snapshot_object_size");
    const owned: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || !Object.hasOwn(descriptor, "value") || descriptor.enumerable !== true) {
        throw new TypeError("invalid_snapshot_object_descriptor");
      }
      owned[key] = dataSnapshot(descriptor.value, allowDate, seen, depth + 1);
    }
    return Object.freeze(owned);
  } finally {
    seen.delete(source);
  }
}

function snapshotStatement(source: PublicCoreCanonicalSqlStatementV1): StatementSnapshotV1 {
  try {
    if (source === null || typeof source !== "object" || !Object.isFrozen(source)) {
      throw new TypeError("invalid_statement_root");
    }
    const prototype = Object.getPrototypeOf(source) as unknown;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("invalid_statement_prototype");
    }
    const descriptors = Object.getOwnPropertyDescriptors(source) as Record<
      PropertyKey,
      PropertyDescriptor
    >;
    const stringKeys = Reflect.ownKeys(descriptors)
      .filter((key): key is string => typeof key === "string");
    if (!sameKeys(stringKeys, STATEMENT_STRING_KEYS)) {
      throw new TypeError("invalid_statement_keys");
    }
    const symbolDescriptors = Reflect.ownKeys(descriptors)
      .filter((key): key is symbol => typeof key === "symbol")
      .map((key) => descriptors[key]);
    if (
      symbolDescriptors.length !== 1
      || !symbolDescriptors[0]
      || !Object.hasOwn(symbolDescriptors[0], "value")
      || symbolDescriptors[0].value !== "r4.public-core.canonical-sql-statement.v1"
    ) throw new TypeError("invalid_statement_brand_shape");
    for (const key of STATEMENT_STRING_KEYS) {
      const descriptor = descriptors[key];
      if (!descriptor || !Object.hasOwn(descriptor, "value") || descriptor.enumerable !== true) {
        throw new TypeError("invalid_statement_descriptor");
      }
    }
    const text = descriptors.text?.value;
    const rawValues = descriptors.values?.value;
    const rawRowKeys = descriptors.rowKeys?.value;
    if (
      typeof text !== "string"
      || text.length === 0
      || text.length > 1_000_000
      || text.includes("\u0000")
    ) throw new TypeError("invalid_statement_text");
    const values = dataSnapshot(rawValues, false);
    const rowKeys = dataSnapshot(rawRowKeys, false);
    if (!Array.isArray(values) || !Array.isArray(rowKeys)) {
      throw new TypeError("invalid_statement_arrays");
    }
    if (
      rowKeys.some((key) => typeof key !== "string" || !ROW_KEY.test(key))
      || new Set(rowKeys).size !== rowKeys.length
    ) throw new TypeError("invalid_statement_row_keys");
    return Object.freeze({
      text,
      values: values as readonly PublicCoreSqlValueV1[],
      rowKeys: rowKeys as readonly string[],
    });
  } catch (error) {
    const details = authenticPublicCorePgExecutorErrorDetails(error);
    if (details !== null) throw error;
    throwExecutorError(
      "public_core_pg_protocol_violation",
      "query",
      "not_started",
    );
  }
}

function resultDescriptors(source: unknown): Readonly<Record<string, PropertyDescriptor>> {
  if (source === null || typeof source !== "object") throw new TypeError("invalid_result_root");
  // Exercise getPrototypeOf as part of the Proxy membrane, but accept pg's
  // concrete Result prototype rather than requiring a plain object.
  Object.getPrototypeOf(source);
  const descriptors = Object.getOwnPropertyDescriptors(source) as unknown as Record<
    PropertyKey,
    PropertyDescriptor
  >;
  if (Reflect.ownKeys(descriptors).some((key) => typeof key === "symbol")) {
    throw new TypeError("invalid_result_symbols");
  }
  for (const descriptor of Object.values(descriptors)) {
    if (!Object.hasOwn(descriptor, "value")) throw new TypeError("invalid_result_accessor");
  }
  return descriptors;
}

function snapshotRowsArray(source: unknown): readonly unknown[] {
  if (!Array.isArray(source) || Object.getPrototypeOf(source) !== Array.prototype) {
    throw new TypeError("invalid_result_rows");
  }
  const descriptors = Object.getOwnPropertyDescriptors(source) as unknown as Record<
    PropertyKey,
    PropertyDescriptor
  >;
  if (Reflect.ownKeys(descriptors).some((key) => typeof key === "symbol")) {
    throw new TypeError("invalid_result_row_symbols");
  }
  const lengthDescriptor = descriptors.length;
  if (
    !lengthDescriptor
    || !Object.hasOwn(lengthDescriptor, "value")
    || !Number.isSafeInteger(lengthDescriptor.value)
    || (lengthDescriptor.value as number) < 0
    || (lengthDescriptor.value as number) > MAX_ARRAY_ITEMS
  ) throw new TypeError("invalid_result_row_length");
  const length = lengthDescriptor.value as number;
  const expectedKeys = ["length", ...Array.from({ length }, (_, index) => String(index))];
  if (!sameKeys(Object.keys(descriptors), expectedKeys)) {
    throw new TypeError("invalid_result_row_array_keys");
  }
  const rows: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !Object.hasOwn(descriptor, "value") || descriptor.enumerable !== true) {
      throw new TypeError("invalid_result_row_descriptor");
    }
    rows.push(descriptor.value);
  }
  return rows;
}

function snapshotQueryResult(
  source: unknown,
  expectedRowKeys: readonly string[],
): PublicCoreSqlQueryResultV1 {
  try {
    const descriptors = resultDescriptors(source);
    const rowCountDescriptor = descriptors.rowCount;
    const rowsDescriptor = descriptors.rows;
    if (
      !rowCountDescriptor
      || !Object.hasOwn(rowCountDescriptor, "value")
      || !rowsDescriptor
      || !Object.hasOwn(rowsDescriptor, "value")
      || !Number.isSafeInteger(rowCountDescriptor.value)
      || (rowCountDescriptor.value as number) < 0
    ) throw new TypeError("invalid_query_result_shape");
    const rawRows = snapshotRowsArray(rowsDescriptor.value);
    if (rawRows.length !== rowCountDescriptor.value) {
      throw new TypeError("invalid_query_result_count");
    }
    const expected = [...expectedRowKeys].sort();
    const rows: Readonly<Record<string, unknown>>[] = [];
    for (const rawRow of rawRows) {
      const row = dataSnapshot(rawRow, true);
      if (row === null || typeof row !== "object" || Array.isArray(row)) {
        throw new TypeError("invalid_query_row");
      }
      const actual = Object.keys(row).sort();
      if (!sameKeys(actual, expected)) throw new TypeError("invalid_query_row_keys");
      rows.push(row as Readonly<Record<string, unknown>>);
    }
    return Object.freeze({
      rowCount: rowCountDescriptor.value as number,
      rows: Object.freeze(rows),
    });
  } catch (error) {
    const details = authenticPublicCorePgExecutorErrorDetails(error);
    if (details !== null) throw error;
    throwExecutorError(
      "public_core_pg_query_result_invalid",
      "query",
      "not_started",
    );
  }
}

function snapshotControlResult(source: unknown): void {
  const descriptors = resultDescriptors(source);
  const rowCountDescriptor = descriptors.rowCount;
  const rowsDescriptor = descriptors.rows;
  if (
    !rowCountDescriptor
    || !Object.hasOwn(rowCountDescriptor, "value")
    || !rowsDescriptor
    || !Object.hasOwn(rowsDescriptor, "value")
    || (rowCountDescriptor.value !== null && rowCountDescriptor.value !== 0)
    || snapshotRowsArray(rowsDescriptor.value).length !== 0
  ) throw new TypeError("invalid_control_result");
}

function safeFrozenPostgresCallbackError(error: unknown): error is PublicCorePostgresError {
  try {
    if (
      !(error instanceof PublicCorePostgresError)
      || Object.getPrototypeOf(error) !== PublicCorePostgresError.prototype
      || !Object.isFrozen(error)
    ) return false;
    const descriptors = Object.getOwnPropertyDescriptors(error) as Record<
      PropertyKey,
      PropertyDescriptor
    >;
    const status = descriptors.status;
    const code = descriptors.code;
    const message = descriptors.message;
    const statusValue = status && Object.hasOwn(status, "value") ? status.value : null;
    const codeValue = code && Object.hasOwn(code, "value") ? code.value : null;
    const messageValue = message && Object.hasOwn(message, "value") ? message.value : null;
    return Boolean(
      typeof statusValue === "number"
      && Number.isSafeInteger(statusValue) && statusValue >= 400 && statusValue <= 599
      && typeof codeValue === "string" && ERROR_CODE.test(codeValue)
      && messageValue === codeValue,
    );
  } catch {
    return false;
  }
}

async function invokeDriverQuery(
  queryPort: CapturedMethodV1,
  text: string,
  values: readonly PublicCoreSqlValueV1[],
): Promise<unknown> {
  return await invokeCaptured(queryPort, [text, values]);
}

async function runControlQuery(
  queryPort: CapturedMethodV1,
  text: string,
  code: PublicCorePgExecutorErrorCodeV1,
  phase: PublicCorePgExecutorErrorPhaseV1,
  transactionOutcome: PublicCorePgExecutorTransactionOutcomeV1,
): Promise<void> {
  let raw: unknown;
  try {
    raw = await invokeDriverQuery(queryPort, text, []);
  } catch {
    throwExecutorError(code, phase, transactionOutcome);
  }
  try {
    snapshotControlResult(raw);
  } catch {
    throwExecutorError(code, phase, transactionOutcome);
  }
}

async function releaseClient(
  releasePort: CapturedMethodV1,
  discard: boolean,
  transactionOutcome: PublicCorePgExecutorTransactionOutcomeV1,
): Promise<void> {
  try {
    const args = discard ? [new Error("public_core_pg_discard_client")] : [];
    await invokeCaptured(releasePort, args);
  } catch {
    throwExecutorError("public_core_pg_release_failed", "release", transactionOutcome);
  }
}

/**
 * Concrete executor over one injected pg Pool. It never imports pg, creates a
 * Pool, reads process configuration, or accepts a DSN/connection string.
 */
export class PublicCorePgExecutorV1 implements PublicCoreSqlExecutorV1 {
  readonly #connectPort: CapturedMethodV1;

  constructor(config: PublicCorePgExecutorConfigV1) {
    this.#connectPort = snapshotConfig(config);
    Object.freeze(this);
  }

  async transaction<T>(
    rawOptions: Readonly<{ isolation: "read_committed"; readOnly: boolean }>,
    work: (transaction: PublicCoreSqlTransactionV1) => Promise<T>,
  ): Promise<T> {
    const options = snapshotOptions(rawOptions);
    if (typeof work !== "function") {
      throwExecutorError(
        "public_core_pg_configuration_invalid",
        "configuration",
        "not_started",
      );
    }

    let client: unknown;
    try {
      client = await invokeCaptured(this.#connectPort, []);
    } catch {
      throwExecutorError("public_core_pg_connect_failed", "connect", "not_started");
    }

    let releasePort: CapturedMethodV1;
    try {
      releasePort = capturedMethod(client, "release");
    } catch {
      throwExecutorError("public_core_pg_client_invalid", "client", "not_started");
    }

    let queryPort: CapturedMethodV1;
    try {
      queryPort = capturedMethod(client, "query");
    } catch {
      try {
        await releaseClient(releasePort, true, "not_started");
      } catch (releaseError) {
        throw releaseError;
      }
      throwExecutorError("public_core_pg_client_invalid", "client", "not_started");
    }

    let transactionOutcome: PublicCorePgExecutorTransactionOutcomeV1 = "not_started";
    let discardClient = false;
    let primaryError: unknown = null;
    let result!: T;
    let active = false;
    let callbackCalls = 0;
    let queryFailure: PublicCorePgExecutorErrorV1 | null = null;
    const pendingQueries = new Set<Promise<unknown>>();

    try {
      const begin = options.readOnly
        ? "BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY"
        : "BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE";
      try {
        await runControlQuery(
          queryPort,
          begin,
          "public_core_pg_begin_failed",
          "begin",
          "not_started",
        );
        active = true;
      } catch (beginError) {
        primaryError = beginError;
        try {
          await runControlQuery(
            queryPort,
            "ROLLBACK",
            "public_core_pg_rollback_failed",
            "rollback",
            "not_started",
          );
          transactionOutcome = "rolled_back";
          const details = authenticPublicCorePgExecutorErrorDetails(primaryError);
          if (details !== null) {
            primaryError = executorError(details.code, details.phase, "rolled_back");
          }
        } catch (rollbackError) {
          primaryError = rollbackError;
          discardClient = true;
        }
      }

      if (primaryError === null) {
        const transaction = Object.freeze({
          query: async (
            statement: PublicCoreCanonicalSqlStatementV1,
          ): Promise<PublicCoreSqlQueryResultV1> => {
            if (!active || queryFailure !== null) {
              throw queryFailure ?? executorError(
                "public_core_pg_protocol_violation",
                "query",
                transactionOutcome,
              );
            }
            let task!: Promise<PublicCoreSqlQueryResultV1>;
            task = (async (): Promise<PublicCoreSqlQueryResultV1> => {
              let snapshot: StatementSnapshotV1;
              try {
                snapshot = snapshotStatement(statement);
              } catch (error) {
                const details = authenticPublicCorePgExecutorErrorDetails(error);
                queryFailure = details === null
                  ? executorError("public_core_pg_protocol_violation", "query", "not_started")
                  : error as PublicCorePgExecutorErrorV1;
                throw queryFailure;
              }
              let raw: unknown;
              try {
                raw = await invokeDriverQuery(queryPort, snapshot.text, snapshot.values);
              } catch {
                queryFailure = executorError(
                  "public_core_pg_query_failed",
                  "query",
                  "not_started",
                );
                throw queryFailure;
              }
              try {
                return snapshotQueryResult(raw, snapshot.rowKeys);
              } catch (error) {
                const details = authenticPublicCorePgExecutorErrorDetails(error);
                queryFailure = details === null
                  ? executorError("public_core_pg_query_result_invalid", "query", "not_started")
                  : error as PublicCorePgExecutorErrorV1;
                throw queryFailure;
              }
            })();
            pendingQueries.add(task);
            void task.then(
              () => pendingQueries.delete(task),
              () => pendingQueries.delete(task),
            );
            return await task;
          },
        });

        let callbackError: unknown = null;
        try {
          callbackCalls += 1;
          result = await Reflect.apply(work, undefined, [transaction]) as T;
        } catch (error) {
          callbackError = error;
        }

        if (pendingQueries.size !== 0) {
          await Promise.allSettled([...pendingQueries]);
          callbackError ??= queryFailure ?? executorError(
            "public_core_pg_protocol_violation",
            "callback",
            "not_started",
          );
        }
        if (callbackCalls !== 1) {
          callbackError = executorError(
            "public_core_pg_protocol_violation",
            "callback",
            "not_started",
          );
        }
        callbackError ??= queryFailure;
        active = false;

        if (callbackError !== null) {
          try {
            await runControlQuery(
              queryPort,
              "ROLLBACK",
              "public_core_pg_rollback_failed",
              "rollback",
              "not_started",
            );
            transactionOutcome = "rolled_back";
            const executorDetails = authenticPublicCorePgExecutorErrorDetails(callbackError);
            primaryError = executorDetails !== null
              ? executorError(executorDetails.code, executorDetails.phase, "rolled_back")
              : safeFrozenPostgresCallbackError(callbackError)
                ? callbackError
              : executorError(
                  "public_core_pg_callback_failed",
                  "callback",
                  "rolled_back",
                );
          } catch (rollbackError) {
            primaryError = rollbackError;
            discardClient = true;
          }
        } else {
          try {
            await runControlQuery(
              queryPort,
              "COMMIT",
              "public_core_pg_commit_ambiguous",
              "commit",
              "ambiguous",
            );
            transactionOutcome = "committed";
          } catch (commitError) {
            transactionOutcome = "ambiguous";
            primaryError = commitError;
            discardClient = true;
          }
        }
      }
    } finally {
      active = false;
      try {
        await releaseClient(releasePort, discardClient, transactionOutcome);
      } catch (releaseError) {
        if (transactionOutcome !== "ambiguous" && primaryError === null) {
          primaryError = releaseError;
        } else if (transactionOutcome !== "ambiguous") {
          const details = authenticPublicCorePgExecutorErrorDetails(primaryError);
          if (details?.code !== "public_core_pg_rollback_failed") primaryError = releaseError;
        }
      }
    }

    if (primaryError !== null) throw primaryError;
    return result;
  }
}

export function createPublicCorePgExecutorV1(
  config: PublicCorePgExecutorConfigV1,
): PublicCorePgExecutorV1 {
  return new PublicCorePgExecutorV1(config);
}
