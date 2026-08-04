import { parseStrictJson } from "../../r4-protocol/src/index.ts";

/**
 * Recovery records are authority-bearing local state. Parse them with the
 * protocol's duplicate-key rejecting parser and admit only their closed shape.
 */
export function parseExactPersistedRecord(
  source: string,
  expectedKeys: readonly string[],
  errorMessage: string,
): Record<string, unknown> {
  try {
    const parsed = parseStrictJson(source);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(errorMessage);
    const actual = Object.keys(parsed).sort();
    const expected = [...expectedKeys].sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
      throw new Error(errorMessage);
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(errorMessage);
  }
}

export function isExactIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

export function isSha256(value: unknown): value is `sha256:${string}` {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
}

export function isPrefixedId(value: unknown, prefix: string): value is string {
  return typeof value === "string" && new RegExp(`^${prefix}_[A-Za-z0-9_-]{16,128}$`, "u").test(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu.test(value);
}

export function isLocalToken(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 256 && !/[\u0000-\u001f\u007f]/u.test(value);
}
