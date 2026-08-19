import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  InMemoryPublicCoreNonceAuthorityV1,
  PUBLIC_CORE_AAD_SCHEMA_VERSION,
  PUBLIC_CORE_ENCRYPTED_COLUMN_NAMES,
  PublicCoreCryptoError,
  PublicCoreCryptoKeyHandleV1,
  decryptPublicCoreField,
  derivePublicCoreKeyVersion,
  encryptPublicCoreField,
  keyedPublicCoreDigest,
  matchesPublicCoreKeyedDigest,
  validatePublicCoreEncryptedField,
  withDecryptedCanonicalPublicCoreField,
  withDecryptedPublicCoreField,
  type PublicCoreFieldAadV1,
  type PublicCoreSecretDigestDomain,
} from "../../apps/room/src/public-core-crypto.ts";
import { canonicalSha256 } from "../../packages/r4-protocol/src/index.ts";
import type { PublicCoreConfigReference } from "../../apps/room/src/production-config.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ROOM_ID = `room_${"a".repeat(32)}`;
const PROJECTION_ID = `projection_${"b".repeat(32)}`;
const BODY_REF = `ref:body-encryption/public-core@sha256:${"1".repeat(64)}` as PublicCoreConfigReference;
const OTHER_BODY_REF = `ref:body-encryption/rotated@sha256:${"2".repeat(64)}` as PublicCoreConfigReference;
const PEPPER_REF = `ref:capability-pepper/public-core@sha256:${"3".repeat(64)}` as PublicCoreConfigReference;
const OTHER_PEPPER_REF = `ref:capability-pepper/rotated@sha256:${"4".repeat(64)}` as PublicCoreConfigReference;
const NONCE_A = Uint8Array.from({ length: 12 }, (_, index) => index + 1);
const NONCE_B = Uint8Array.from({ length: 12 }, (_, index) => index + 41);

function bodyKey(reference = BODY_REF, fill = 11): PublicCoreCryptoKeyHandleV1 {
  return new PublicCoreCryptoKeyHandleV1({
    purpose: "body_encryption",
    reference,
    material: new Uint8Array(32).fill(fill),
  });
}

function pepperKey(reference = PEPPER_REF, fill = 29): PublicCoreCryptoKeyHandleV1 {
  return new PublicCoreCryptoKeyHandleV1({
    purpose: "capability_pepper",
    reference,
    material: new Uint8Array(32).fill(fill),
  });
}

function aad(overrides: Partial<PublicCoreFieldAadV1> = {}): PublicCoreFieldAadV1 {
  return {
    schemaVersion: PUBLIC_CORE_AAD_SCHEMA_VERSION,
    table: "projections",
    column: "capsule_ciphertext",
    roomId: ROOM_ID,
    rowId: PROJECTION_ID,
    objectVersion: 1,
    ...overrides,
  };
}

function expectSanitized(error: unknown, code: string, canary: string): boolean {
  assert.ok(error instanceof PublicCoreCryptoError);
  assert.equal(error.code, code);
  const serialized = `${String(error)}\n${JSON.stringify(error)}`;
  assert.equal(serialized.includes(canary), false);
  return true;
}

function flipCanonical(value: string): string {
  const first = value[0];
  assert.ok(first);
  return `${first === "A" ? "B" : "A"}${value.slice(1)}`;
}

test("#67 production-specific a256gcm envelope binds exact AAD, key version, nonce authority, and plaintext hash", async () => {
  const canary = "PRIVATE_PROJECTION_CANARY_ONLY";
  const plaintext = encoder.encode(canary);
  const key = bodyKey();
  const authority = new InMemoryPublicCoreNonceAuthorityV1();
  const encrypted = await encryptPublicCoreField({
    key,
    plaintext,
    aad: aad(),
    nonceAuthority: authority,
    nonceSource: () => NONCE_A,
  });

  assert.deepEqual(PUBLIC_CORE_ENCRYPTED_COLUMN_NAMES, [
    "rooms.label_ciphertext",
    "projections.capsule_ciphertext",
    "pairing_challenges.pairing_code_ciphertext",
    "pairing_challenges.exchange_envelope_ciphertext",
    "interactions.request_ciphertext",
    "interactions.guest_capsule_ciphertext",
  ]);
  assert.deepEqual(Object.keys(encrypted.envelope).sort(), [
    "aadHash", "algorithm", "ciphertext", "keyVersion", "nonce", "schemaVersion", "tag",
  ]);
  assert.equal(encrypted.envelope.schemaVersion, "a256gcm.v1");
  assert.equal(encrypted.envelope.algorithm, "AES-256-GCM");
  assert.equal(encrypted.envelope.keyVersion, derivePublicCoreKeyVersion(BODY_REF, "body_encryption"));
  assert.equal(encrypted.nonceRegistration.keyVersion, encrypted.envelope.keyVersion);
  assert.equal(encrypted.nonceRegistration.fieldVersion, 1);
  assert.equal(encrypted.nonceRegistration.table, "projections");
  assert.equal(encrypted.nonceRegistration.column, "capsule_ciphertext");
  assert.deepEqual(encrypted.nonceRegistration.nonce, NONCE_A);
  assert.equal(authority.size, 1);
  assert.match(encrypted.plaintextHash, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(JSON.stringify(encrypted).includes(canary), false);

  const opened = decryptPublicCoreField({
    key,
    envelope: encrypted.envelope,
    aad: aad(),
    bodyReadable: true,
    expectedPlaintextHash: encrypted.plaintextHash,
  });
  assert.equal(decoder.decode(opened), canary);
  opened.fill(0);
  assert.equal(await withDecryptedPublicCoreField({
    key,
    envelope: encrypted.envelope,
    aad: aad(),
    bodyReadable: true,
    expectedPlaintextHash: encrypted.plaintextHash,
  }, (bytes) => decoder.decode(bytes)), canary);

  let zeroizedView: Uint8Array | null = null;
  await withDecryptedPublicCoreField({
    key,
    envelope: encrypted.envelope,
    aad: aad(),
    bodyReadable: true,
    expectedPlaintextHash: encrypted.plaintextHash,
  }, (bytes) => {
    zeroizedView = bytes;
    return null;
  });
  assert.ok(zeroizedView);
  const observedZeroizedView = zeroizedView as unknown as Uint8Array;
  assert.equal(observedZeroizedView.every((byte: number) => byte === 0), true);

  await assert.rejects(
    withDecryptedPublicCoreField({
      key,
      envelope: encrypted.envelope,
      aad: aad(),
      bodyReadable: true,
      expectedPlaintextHash: encrypted.plaintextHash,
    }, (bytes) => {
      throw new Error(decoder.decode(bytes));
    }),
    (error: unknown) => expectSanitized(
      error,
      "R4_PUBLIC_CORE_CRYPTO_PLAINTEXT_CALLBACK_FAILED",
      canary,
    ),
  );
  await assert.rejects(
    withDecryptedPublicCoreField({
      key,
      envelope: encrypted.envelope,
      aad: aad(),
      bodyReadable: true,
      expectedPlaintextHash: encrypted.plaintextHash,
    }, async (bytes) => { throw new Error(decoder.decode(bytes)); }),
    (error: unknown) => expectSanitized(error, "R4_PUBLIC_CORE_CRYPTO_PLAINTEXT_CALLBACK_FAILED", canary),
  );

  const serializedKey = JSON.stringify(key);
  assert.equal(serializedKey.includes(BODY_REF), false);
  assert.equal(serializedKey.includes(Buffer.from(new Uint8Array(32).fill(11)).toString("hex")), false);
  key.close();
  assert.equal(key.closed, true);
  assert.throws(
    () => decryptPublicCoreField({
      key,
      envelope: encrypted.envelope,
      aad: aad(),
      bodyReadable: true,
      expectedPlaintextHash: encrypted.plaintextHash,
    }),
    (error: unknown) => expectSanitized(error, "R4_PUBLIC_CORE_CRYPTO_KEY_UNAVAILABLE", canary),
  );
});

test("nonce and exact field-version authority reject global nonce reuse and field-version reuse", async () => {
  const authority = new InMemoryPublicCoreNonceAuthorityV1();
  const key = bodyKey();
  const first = await encryptPublicCoreField({
    key,
    plaintext: encoder.encode("first"),
    aad: aad(),
    nonceAuthority: authority,
    nonceSource: () => NONCE_A,
  });
  assert.equal(first.nonceRegistration.fieldVersion, 1);

  await assert.rejects(
    encryptPublicCoreField({
      key,
      plaintext: encoder.encode("same nonce, other field"),
      aad: aad({ rowId: `projection_${"c".repeat(32)}`, objectVersion: 2 }),
      nonceAuthority: authority,
      nonceSource: () => NONCE_A,
    }),
    (error: unknown) => expectSanitized(error, "R4_PUBLIC_CORE_CRYPTO_NONCE_REUSED", "same nonce, other field"),
  );
  await assert.rejects(
    encryptPublicCoreField({
      key,
      plaintext: encoder.encode("same field version, other nonce"),
      aad: aad(),
      nonceAuthority: authority,
      nonceSource: () => NONCE_B,
    }),
    (error: unknown) => expectSanitized(error, "R4_PUBLIC_CORE_CRYPTO_NONCE_REUSED", "same field version, other nonce"),
  );
  assert.equal(authority.size, 1);

  const adapterCanary = "NONCE_ADAPTER_PRIVATE_CANARY";
  await assert.rejects(
    encryptPublicCoreField({
      key,
      plaintext: encoder.encode("adapter fault"),
      aad: aad({ rowId: `projection_${"e".repeat(32)}`, objectVersion: 2 }),
      nonceAuthority: {
        reserve(): never {
          throw new PublicCoreCryptoError(adapterCanary);
        },
      },
      nonceSource: () => NONCE_B,
    }),
    (error: unknown) => expectSanitized(
      error,
      "R4_PUBLIC_CORE_CRYPTO_NONCE_RESERVATION_FAILED",
      adapterCanary,
    ),
  );

  const sameCodeCanary = "NONCE_REUSE_ERROR_OBJECT_CANARY";
  await assert.rejects(
    encryptPublicCoreField({
      key,
      plaintext: encoder.encode("adapter claims nonce reuse"),
      aad: aad({ rowId: `projection_${"0".repeat(32)}`, objectVersion: 2 }),
      nonceAuthority: {
        reserve(): never {
          const error = new PublicCoreCryptoError("R4_PUBLIC_CORE_CRYPTO_NONCE_REUSED");
          error.name = sameCodeCanary;
          throw error;
        },
      },
      nonceSource: () => NONCE_B,
    }),
    (error: unknown) => expectSanitized(error, "R4_PUBLIC_CORE_CRYPTO_NONCE_REUSED", sameCodeCanary),
  );

  const codeGetterCanary = "NONCE_ERROR_CODE_GETTER_CANARY";
  await assert.rejects(
    encryptPublicCoreField({
      key,
      plaintext: encoder.encode("adapter code getter fault"),
      aad: aad({ rowId: `projection_${"9".repeat(32)}`, objectVersion: 2 }),
      nonceAuthority: {
        reserve(): never {
          const error = new PublicCoreCryptoError("R4_PUBLIC_CORE_CRYPTO_NONCE_REUSED");
          Object.defineProperty(error, "code", {
            get(): never { throw new Error(codeGetterCanary); },
          });
          throw error;
        },
      },
      nonceSource: () => NONCE_B,
    }),
    (error: unknown) => expectSanitized(
      error,
      "R4_PUBLIC_CORE_CRYPTO_NONCE_RESERVATION_FAILED",
      codeGetterCanary,
    ),
  );

  const nonceSourceCanary = "NONCE_SOURCE_PRIVATE_CANARY";
  await assert.rejects(
    encryptPublicCoreField({
      key,
      plaintext: encoder.encode("nonce source fault"),
      aad: aad({ rowId: `projection_${"f".repeat(32)}`, objectVersion: 2 }),
      nonceAuthority: authority,
      nonceSource: (): never => { throw new Error(nonceSourceCanary); },
    }),
    (error: unknown) => expectSanitized(
      error,
      "R4_PUBLIC_CORE_CRYPTO_NONCE_SOURCE_FAILED",
      nonceSourceCanary,
    ),
  );
  key.close();
});

test("canonical-body decrypt authenticates first, validates the typed hash subject, and contains hostile plaintext callbacks", async () => {
  const canary = "CANONICAL_BODY_PRIVATE_CANARY";
  const preimage = Object.freeze({ schemaVersion: "canonical_test.v1", message: canary });
  const value = Object.freeze({ ...preimage, payloadHash: canonicalSha256(preimage) });
  const key = bodyKey();
  const encrypted = await encryptPublicCoreField({
    key,
    plaintext: encoder.encode(JSON.stringify(value)),
    aad: aad(),
    nonceAuthority: new InMemoryPublicCoreNonceAuthorityV1(),
    nonceSource: () => NONCE_A,
  });
  let parseCalls = 0;
  const parseCanonical = (plaintext: string) => {
    parseCalls += 1;
    const parsed = JSON.parse(plaintext) as typeof value;
    assert.deepEqual(Object.keys(parsed).sort(), ["message", "payloadHash", "schemaVersion"]);
    assert.equal(parsed.schemaVersion, "canonical_test.v1");
    assert.equal(typeof parsed.message, "string");
    assert.equal(typeof parsed.payloadHash, "string");
    const { payloadHash, ...canonicalValue } = parsed;
    assert.equal(payloadHash, canonicalSha256(canonicalValue));
    return Object.freeze({ value: Object.freeze(parsed), canonicalValue: Object.freeze(canonicalValue) });
  };
  const input = {
    key,
    envelope: encrypted.envelope,
    aad: aad(),
    bodyReadable: true,
    expectedCanonicalHash: value.payloadHash,
    maximumPlaintextBytes: 1_024,
    parseCanonical,
  } as const;

  assert.deepEqual(await withDecryptedCanonicalPublicCoreField(input), value);
  assert.equal(await withDecryptedCanonicalPublicCoreField(input, (typed) => typed.schemaVersion), "canonical_test.v1");

  parseCalls = 0;
  await assert.rejects(
    withDecryptedCanonicalPublicCoreField({
      ...input,
      envelope: { ...encrypted.envelope, tag: flipCanonical(encrypted.envelope.tag) },
    }),
    (error: unknown) => expectSanitized(error, "R4_PUBLIC_CORE_CRYPTO_AUTHENTICATION_FAILED", canary),
  );
  assert.equal(parseCalls, 0, "typed parsing must not run before AEAD authentication");

  await assert.rejects(
    withDecryptedCanonicalPublicCoreField({
      ...input,
      expectedCanonicalHash: canonicalSha256({ ...preimage, message: "different" }),
    }),
    (error: unknown) => expectSanitized(error, "R4_PUBLIC_CORE_CRYPTO_INTEGRITY_FAILED", canary),
  );
  await assert.rejects(
    withDecryptedCanonicalPublicCoreField({ ...input, maximumPlaintextBytes: 8 }),
    (error: unknown) => expectSanitized(error, "R4_PUBLIC_CORE_CRYPTO_PLAINTEXT_TOO_LARGE", canary),
  );
  await assert.rejects(
    withDecryptedCanonicalPublicCoreField({
      ...input,
      parseCanonical(): never { throw new Error(canary); },
    }),
    (error: unknown) => expectSanitized(error, "R4_PUBLIC_CORE_CRYPTO_CANONICAL_BODY_INVALID", canary),
  );
  await assert.rejects(
    withDecryptedCanonicalPublicCoreField(input, (): never => { throw new Error(canary); }),
    (error: unknown) => expectSanitized(error, "R4_PUBLIC_CORE_CRYPTO_PLAINTEXT_CALLBACK_FAILED", canary),
  );
  await assert.rejects(
    withDecryptedCanonicalPublicCoreField(input, () => encoder.encode(canary)),
    (error: unknown) => expectSanitized(error, "R4_PUBLIC_CORE_CRYPTO_PLAINTEXT_ESCAPE_DENIED", canary),
  );

  const invalidUtf8 = await encryptPublicCoreField({
    key,
    plaintext: Uint8Array.of(0xff),
    aad: aad({ objectVersion: 2 }),
    nonceAuthority: new InMemoryPublicCoreNonceAuthorityV1(),
    nonceSource: () => NONCE_B,
  });
  await assert.rejects(
    withDecryptedCanonicalPublicCoreField({
      ...input,
      envelope: invalidUtf8.envelope,
      aad: aad({ objectVersion: 2 }),
    }),
    (error: unknown) => expectSanitized(error, "R4_PUBLIC_CORE_CRYPTO_CANONICAL_BODY_INVALID", canary),
  );
  key.close();
});

test("unknown key, AAD/tag/ciphertext/hash drift, lifecycle denial, and historical envelope shape fail closed", async () => {
  const canary = "INTERACTION_REQUEST_CANARY";
  const key = bodyKey();
  const encrypted = await encryptPublicCoreField({
    key,
    plaintext: encoder.encode(canary),
    aad: aad(),
    nonceAuthority: new InMemoryPublicCoreNonceAuthorityV1(),
    nonceSource: () => NONCE_A,
  });
  const otherKey = bodyKey(OTHER_BODY_REF, 11);
  const wrongHash = `sha256:${"f".repeat(64)}` as const;
  const cases: Array<{ envelope: unknown; fieldAad: PublicCoreFieldAadV1; bodyReadable: boolean; hash: `sha256:${string}`; code: string }> = [
    { envelope: encrypted.envelope, fieldAad: aad(), bodyReadable: true, hash: encrypted.plaintextHash, code: "R4_PUBLIC_CORE_CRYPTO_AUTHENTICATION_FAILED" },
    { envelope: encrypted.envelope, fieldAad: aad({ rowId: `projection_${"d".repeat(32)}` }), bodyReadable: true, hash: encrypted.plaintextHash, code: "R4_PUBLIC_CORE_CRYPTO_AUTHENTICATION_FAILED" },
    { envelope: { ...encrypted.envelope, tag: flipCanonical(encrypted.envelope.tag) }, fieldAad: aad(), bodyReadable: true, hash: encrypted.plaintextHash, code: "R4_PUBLIC_CORE_CRYPTO_AUTHENTICATION_FAILED" },
    { envelope: { ...encrypted.envelope, ciphertext: flipCanonical(encrypted.envelope.ciphertext) }, fieldAad: aad(), bodyReadable: true, hash: encrypted.plaintextHash, code: "R4_PUBLIC_CORE_CRYPTO_AUTHENTICATION_FAILED" },
    { envelope: encrypted.envelope, fieldAad: aad(), bodyReadable: true, hash: wrongHash, code: "R4_PUBLIC_CORE_CRYPTO_INTEGRITY_FAILED" },
    { envelope: encrypted.envelope, fieldAad: aad(), bodyReadable: false, hash: encrypted.plaintextHash, code: "R4_PUBLIC_CORE_CRYPTO_BODY_UNREADABLE" },
  ];

  for (const [index, entry] of cases.entries()) {
    assert.throws(
      () => decryptPublicCoreField({
        key: index === 0 ? otherKey : key,
        envelope: entry.envelope,
        aad: entry.fieldAad,
        bodyReadable: entry.bodyReadable,
        expectedPlaintextHash: entry.hash,
      }),
      (error: unknown) => expectSanitized(error, entry.code, canary),
    );
  }

  const historicalGateBEnvelope = {
    schemaVersion: "a256gcm.v1",
    algorithm: "AES-256-GCM",
    keyId: "r4.hosted.gate-b.synthetic.v1",
    nonce: encrypted.envelope.nonce,
    ciphertext: encrypted.envelope.ciphertext,
    tag: encrypted.envelope.tag,
    aadHash: encrypted.envelope.aadHash,
  };
  assert.throws(
    () => validatePublicCoreEncryptedField(historicalGateBEnvelope),
    (error: unknown) => expectSanitized(error, "R4_PUBLIC_CORE_CRYPTO_ENVELOPE_INVALID", canary),
  );
  assert.throws(
    () => validatePublicCoreEncryptedField({ ...encrypted.envelope, plaintextFallback: canary }),
    (error: unknown) => expectSanitized(error, "R4_PUBLIC_CORE_CRYPTO_ENVELOPE_INVALID", canary),
  );

  key.close();
  otherKey.close();
});

test("domain-separated keyed digests cannot substitute across encounter, binding, reply, delete, pairing, or rate scopes", () => {
  const secretCanary = "ONE_SECRET_MUST_NOT_CROSS_DOMAINS";
  const secret = encoder.encode(secretCanary);
  const key = pepperKey();
  const domains: PublicCoreSecretDigestDomain[] = [
    "public_encounter_secret",
    "room_binding_credential",
    "interaction_reply_secret",
    "interaction_delete_secret",
    "room_pairing_code",
    "coarse_rate_bucket",
    "actor_scope",
  ];
  const digests = domains.map((domain) => keyedPublicCoreDigest({ key, domain, value: secret }));
  assert.equal(new Set(digests.map((value) => value.digest)).size, domains.length);
  assert.equal(JSON.stringify(digests).includes(secretCanary), false);
  for (const [index, domain] of domains.entries()) {
    assert.equal(matchesPublicCoreKeyedDigest({ key, domain, value: secret, expected: digests[index] }), true);
    const next = digests[(index + 1) % digests.length];
    assert.equal(matchesPublicCoreKeyedDigest({ key, domain, value: secret, expected: next }), false);
  }

  const rotated = pepperKey(OTHER_PEPPER_REF, 29);
  assert.equal(matchesPublicCoreKeyedDigest({
    key: rotated,
    domain: "public_encounter_secret",
    value: secret,
    expected: digests[0],
  }), false);
  key.close();
  rotated.close();
});

test("public-core crypto is independent from the historical Gate-B synthetic encrypted-field implementation", () => {
  const source = readFileSync(new URL("../../apps/room/src/public-core-crypto.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /r4-persistence\/src\/encrypted-field/u);
  assert.doesNotMatch(source, /GATE_B_SYNTHETIC_KEY_ID/u);
  assert.doesNotMatch(source, /plaintextFallback/u);
});
