export type JsonPrimitive = null | boolean | number | string;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

const textEncoder = new TextEncoder();

function assertUnicode(value: string, label: string): void {
  if (value.normalize("NFC") !== value) {
    throw new TypeError(`${label} must be NFC-normalized`);
  }
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new TypeError(`${label} contains an unpaired high surrogate`);
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError(`${label} contains an unpaired low surrogate`);
    }
  }
}

function compareUtf8(left: string, right: string): number {
  const leftBytes = textEncoder.encode(left);
  const rightBytes = textEncoder.encode(right);
  const common = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < common; index += 1) {
    const delta = (leftBytes[index] ?? 0) - (rightBytes[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return leftBytes.length - rightBytes.length;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function encodeCanonical(value: unknown, path: string): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} must contain only finite numbers`);
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (typeof value === "string") {
    assertUnicode(value, path);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item, index) => encodeCanonical(item, `${path}[${index}]`)).join(",")}]`;
  }
  if (!isPlainObject(value)) {
    throw new TypeError(`${path} contains a non-JSON value`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${path} contains a symbol-keyed member`);
  }

  const keys = Object.keys(value).sort(compareUtf8);
  const entries: string[] = [];
  for (const key of keys) {
    assertUnicode(key, `${path} key`);
    const member = value[key];
    if (member === undefined) throw new TypeError(`${path}.${key} is undefined`);
    entries.push(`${JSON.stringify(key)}:${encodeCanonical(member, `${path}.${key}`)}`);
  }
  return `{${entries.join(",")}}`;
}

/** Proposed R4 canonical JSON: NFC strings, finite numbers, UTF-8 bytewise key order. */
export function canonicalJson(value: unknown): string {
  return encodeCanonical(value, "$ ".trim());
}

export function canonicalJsonBytes(value: unknown): Uint8Array {
  return textEncoder.encode(canonicalJson(value));
}

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** Dependency-free SHA-256 so the pure protocol package imports no runtime adapter. */
export function sha256Hex(bytes: Uint8Array): string {
  const bitLength = BigInt(bytes.length) * 8n;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  for (let index = 0; index < 8; index += 1) {
    padded[paddedLength - 1 - index] = Number((bitLength >> BigInt(index * 8)) & 0xffn);
  }

  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const words = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const base = offset + index * 4;
      words[index] = (((padded[base] ?? 0) << 24) | ((padded[base + 1] ?? 0) << 16) |
        ((padded[base + 2] ?? 0) << 8) | (padded[base + 3] ?? 0)) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const previous15 = words[index - 15] ?? 0;
      const previous2 = words[index - 2] ?? 0;
      const sigma0 = rightRotate(previous15, 7) ^ rightRotate(previous15, 18) ^ (previous15 >>> 3);
      const sigma1 = rightRotate(previous2, 17) ^ rightRotate(previous2, 19) ^ (previous2 >>> 10);
      words[index] = ((words[index - 16] ?? 0) + sigma0 + (words[index - 7] ?? 0) + sigma1) >>> 0;
    }

    let a = hash[0] ?? 0;
    let b = hash[1] ?? 0;
    let c = hash[2] ?? 0;
    let d = hash[3] ?? 0;
    let e = hash[4] ?? 0;
    let f = hash[5] ?? 0;
    let g = hash[6] ?? 0;
    let h = hash[7] ?? 0;

    for (let index = 0; index < 64; index += 1) {
      const sum1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temporary1 = (h + sum1 + choose + (SHA256_K[index] ?? 0) + (words[index] ?? 0)) >>> 0;
      const sum0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    hash[0] = ((hash[0] ?? 0) + a) >>> 0;
    hash[1] = ((hash[1] ?? 0) + b) >>> 0;
    hash[2] = ((hash[2] ?? 0) + c) >>> 0;
    hash[3] = ((hash[3] ?? 0) + d) >>> 0;
    hash[4] = ((hash[4] ?? 0) + e) >>> 0;
    hash[5] = ((hash[5] ?? 0) + f) >>> 0;
    hash[6] = ((hash[6] ?? 0) + g) >>> 0;
    hash[7] = ((hash[7] ?? 0) + h) >>> 0;
  }

  return Array.from(hash, (word) => word.toString(16).padStart(8, "0")).join("");
}

export function canonicalSha256(value: unknown): `sha256:${string}` {
  return `sha256:${sha256Hex(canonicalJsonBytes(value))}`;
}

export function canonicalSha256Omitting(
  value: Readonly<Record<string, unknown>>,
  omittedKeys: readonly string[],
): `sha256:${string}` {
  const omitted = new Set(omittedKeys);
  const preimage: Record<string, unknown> = {};
  for (const [key, member] of Object.entries(value)) {
    if (!omitted.has(key)) preimage[key] = member;
  }
  return canonicalSha256(preimage);
}

class StrictJsonParser {
  readonly #source: string;
  #index = 0;

  constructor(source: string) {
    this.#source = source;
  }

  parse(): JsonValue {
    this.#skipWhitespace();
    const value = this.#parseValue();
    this.#skipWhitespace();
    if (this.#index !== this.#source.length) this.#error("unexpected trailing input");
    return value;
  }

  #parseValue(): JsonValue {
    const char = this.#source[this.#index];
    if (char === "{") return this.#parseObject();
    if (char === "[") return this.#parseArray();
    if (char === "\"") return this.#parseString();
    if (char === "t") return this.#literal("true", true);
    if (char === "f") return this.#literal("false", false);
    if (char === "n") return this.#literal("null", null);
    return this.#parseNumber();
  }

  #parseObject(): { readonly [key: string]: JsonValue } {
    this.#index += 1;
    this.#skipWhitespace();
    const object: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
    const seen = new Set<string>();
    if (this.#source[this.#index] === "}") {
      this.#index += 1;
      return object;
    }
    while (true) {
      if (this.#source[this.#index] !== "\"") this.#error("object key must be a string");
      const key = this.#parseString();
      if (seen.has(key)) this.#error(`duplicate object key ${JSON.stringify(key)}`);
      seen.add(key);
      this.#skipWhitespace();
      if (this.#source[this.#index] !== ":") this.#error("expected ':'");
      this.#index += 1;
      this.#skipWhitespace();
      object[key] = this.#parseValue();
      this.#skipWhitespace();
      const separator = this.#source[this.#index];
      if (separator === "}") {
        this.#index += 1;
        return object;
      }
      if (separator !== ",") this.#error("expected ',' or '}'");
      this.#index += 1;
      this.#skipWhitespace();
    }
  }

  #parseArray(): readonly JsonValue[] {
    this.#index += 1;
    this.#skipWhitespace();
    const array: JsonValue[] = [];
    if (this.#source[this.#index] === "]") {
      this.#index += 1;
      return array;
    }
    while (true) {
      array.push(this.#parseValue());
      this.#skipWhitespace();
      const separator = this.#source[this.#index];
      if (separator === "]") {
        this.#index += 1;
        return array;
      }
      if (separator !== ",") this.#error("expected ',' or ']'");
      this.#index += 1;
      this.#skipWhitespace();
    }
  }

  #parseString(): string {
    const start = this.#index;
    this.#index += 1;
    let escaped = false;
    while (this.#index < this.#source.length) {
      const code = this.#source.charCodeAt(this.#index);
      if (!escaped && code === 0x22) {
        this.#index += 1;
        let value: string;
        try {
          value = JSON.parse(this.#source.slice(start, this.#index)) as string;
        } catch {
          this.#error("invalid JSON string");
        }
        assertUnicode(value, "JSON string");
        return value;
      }
      if (!escaped && code < 0x20) this.#error("unescaped control character");
      if (!escaped && code === 0x5c) {
        escaped = true;
      } else {
        escaped = false;
      }
      this.#index += 1;
    }
    this.#error("unterminated string");
  }

  #parseNumber(): number {
    const remainder = this.#source.slice(this.#index);
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(remainder);
    if (!match) this.#error("invalid value");
    this.#index += match[0].length;
    const number = Number(match[0]);
    if (!Number.isFinite(number)) this.#error("number must be finite");
    return number;
  }

  #literal<T extends JsonPrimitive>(literal: string, value: T): T {
    if (!this.#source.startsWith(literal, this.#index)) this.#error(`expected ${literal}`);
    this.#index += literal.length;
    return value;
  }

  #skipWhitespace(): void {
    while (this.#index < this.#source.length) {
      const char = this.#source[this.#index];
      if (char !== " " && char !== "\t" && char !== "\n" && char !== "\r") break;
      this.#index += 1;
    }
  }

  #error(message: string): never {
    throw new SyntaxError(`${message} at byte-like character offset ${this.#index}`);
  }
}

/** Strict parser used before schema validation; unlike JSON.parse it rejects duplicate keys. */
export function parseStrictJson(source: string): JsonValue {
  return new StrictJsonParser(source).parse();
}
