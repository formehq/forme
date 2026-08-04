const textEncoder = new TextEncoder();

export class ProtocolValidationError extends Error {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "ProtocolValidationError";
    this.code = code;
    this.path = path;
  }
}

export function utf8ByteLength(value: string): number {
  return textEncoder.encode(value).length;
}

export function unicodeScalarLength(value: string): number {
  return [...value].length;
}

export function assertCanonicalText(
  value: unknown,
  path: string,
  limits: { readonly maxBytes?: number; readonly maxScalars?: number; readonly minScalars?: number } = {},
): asserts value is string {
  if (typeof value !== "string") {
    throw new ProtocolValidationError("invalid_type", path, "expected a string");
  }
  if (value.normalize("NFC") !== value) {
    throw new ProtocolValidationError("non_nfc_text", path, "must be NFC-normalized");
  }
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new ProtocolValidationError("invalid_unicode", path, "contains an unpaired high surrogate");
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new ProtocolValidationError("invalid_unicode", path, "contains an unpaired low surrogate");
    }
  }
  const scalars = unicodeScalarLength(value);
  if (limits.minScalars !== undefined && scalars < limits.minScalars) {
    throw new ProtocolValidationError("text_too_short", path, `must contain at least ${limits.minScalars} scalars`);
  }
  if (limits.maxScalars !== undefined && scalars > limits.maxScalars) {
    throw new ProtocolValidationError("text_too_long", path, `must contain at most ${limits.maxScalars} scalars`);
  }
  const bytes = utf8ByteLength(value);
  if (limits.maxBytes !== undefined && bytes > limits.maxBytes) {
    throw new ProtocolValidationError("text_too_large", path, `must contain at most ${limits.maxBytes} UTF-8 bytes`);
  }
}

export function assertUtcTimestamp(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) {
    throw new ProtocolValidationError("invalid_timestamp", path, "expected UTC RFC 3339 with millisecond precision");
  }
  const millis = Date.parse(value);
  if (!Number.isFinite(millis) || new Date(millis).toISOString() !== value) {
    throw new ProtocolValidationError("invalid_timestamp", path, "timestamp is not a real UTC instant");
  }
}

export function assertOpaqueId(value: unknown, prefix: string, path: string): asserts value is string {
  assertCanonicalText(value, path, { minScalars: prefix.length + 17, maxScalars: 160 });
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  if (!new RegExp(`^${escapedPrefix}_[A-Za-z0-9_-]{16,128}$`, "u").test(value)) {
    throw new ProtocolValidationError("invalid_id", path, `expected opaque ${prefix}_ identifier`);
  }
}

export function assertSha256(value: unknown, path: string): asserts value is `sha256:${string}` {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(value)) {
    throw new ProtocolValidationError("invalid_hash", path, "expected lowercase sha256:<64 hex>");
  }
}

export function assertIntegerInRange(value: unknown, path: string, minimum: number, maximum: number): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new ProtocolValidationError("invalid_integer", path, `expected integer in [${minimum}, ${maximum}]`);
  }
}

export function assertRecord(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ProtocolValidationError("invalid_type", path, "expected an object");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new ProtocolValidationError("invalid_object", path, "expected a plain object");
  }
}

export function assertExactKeys(
  value: Record<string, unknown>,
  path: string,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      throw new ProtocolValidationError("missing_field", `${path}.${key}`, "field is required");
    }
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new ProtocolValidationError("unknown_field", `${path}.${key}`, "field is not allowed");
    }
  }
}

export function assertOneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  path: string,
): asserts value is T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new ProtocolValidationError("invalid_enum", path, `expected one of ${allowed.join(", ")}`);
  }
}

export function assertArray(value: unknown, path: string, minimum: number, maximum: number): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new ProtocolValidationError("invalid_array", path, `expected array length in [${minimum}, ${maximum}]`);
  }
}

export function compareTimestamps(left: string, right: string): number {
  return Date.parse(left) - Date.parse(right);
}

export function addMilliseconds(timestamp: string, milliseconds: number): string {
  assertUtcTimestamp(timestamp, "timestamp");
  if (!Number.isSafeInteger(milliseconds)) {
    throw new ProtocolValidationError("invalid_integer", "milliseconds", "expected a safe integer");
  }
  return new Date(Date.parse(timestamp) + milliseconds).toISOString();
}
