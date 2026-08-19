import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import {
  canonicalJson,
  parseStrictJson,
  validateGuestCapsuleV1,
  type GuestCapsuleV1,
} from "../../r4-protocol/src/index.ts";
import { assertBodyFree } from "./body-free.ts";
import {
  parseCoreRoomApiSecureInput,
  type CoreRoomApiAction,
  type CoreRoomApiSecureInputV1,
} from "./hosted-room-api.ts";

export interface R4CliIo {
  stdout(value: string): void;
  stderr(value: string): void;
  readSecret(fd: number): string;
  writeSecret(value: string): void;
}

export interface RoomCliPort {
  pair(input: { pairingCode: string }): Promise<unknown>;
  status(): Promise<unknown>;
  sync(): Promise<unknown>;
  prepareResponse(interactionId: string): Promise<unknown>;
  reconcile(): Promise<unknown>;
  api(input: { action: CoreRoomApiAction; input: CoreRoomApiSecureInputV1 }): Promise<unknown>;
}

export interface GuestCliPort {
  inspect(input: GuestCapabilityInput): Promise<unknown>;
  ask(input: GuestAskMutation): Promise<unknown>;
  status(input: GuestCapabilityInput): Promise<unknown>;
  delete(input: GuestCapabilityInput): Promise<unknown>;
  mintAgentToken(input: GuestAgentTokenMutation): Promise<unknown>;
}

export interface GuestCapabilityInput {
  readonly capabilityId: string;
  readonly capabilitySecret: string;
}

export interface GuestAskRecoveryV1 {
  readonly schemaVersion: "guest_ask_recovery.v1";
  readonly idempotencyKey: string;
  readonly replySecret: string;
  readonly deleteSecret: string;
}

export interface GuestAskMutation extends GuestCapabilityInput {
  readonly interactionType: "ask" | "seed" | "resonance";
  readonly requestText: string;
  readonly guestCapsule: GuestCapsuleV1 | null;
  readonly recovery: GuestAskRecoveryV1;
}

export interface GuestAgentTokenRecoveryV1 {
  readonly schemaVersion: "guest_agent_token_recovery.v1";
  readonly idempotencyKey: string;
  readonly derivativeSecret: string;
  readonly replySecret: string;
  readonly deleteSecret: string;
}

/**
 * Manual-owned secure output. The whole bundle is retained by the Manual
 * capability holder before mutation; only `agentShare` is handed to an Agent.
 */
export interface GuestAgentTokenSecretBundleV1 {
  readonly schemaVersion: "guest_agent_token_secret_bundle.v1";
  readonly manualRecovery: GuestAgentTokenRecoveryV1;
  readonly agentShare: {
    readonly schemaVersion: "guest_agent_token_share.v1";
    readonly derivativeSecret: string;
  };
}

export interface GuestAgentTokenMutation extends GuestCapabilityInput {
  readonly recovery: GuestAgentTokenRecoveryV1;
}

export interface R4CliEnvironment {
  room: RoomCliPort;
  guest: GuestCliPort;
}

function oneLineJson(value: unknown): string {
  return canonicalJson(value);
}

function exactArgs(args: string[], expected: number, usage: string): void {
  if (args.length !== expected) throw new Error(`usage: ${usage}`);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const expected = new Set(keys);
  if (Object.keys(value).length !== expected.size || Object.keys(value).some((key) => !expected.has(key))) {
    throw new Error(`${label} has an unknown or missing field`);
  }
}

function secureString(value: unknown, label: string, minimum = 1, maximumBytes = 16 * 1_024): string {
  if (typeof value !== "string" || value.length < minimum || Buffer.byteLength(value, "utf8") > maximumBytes) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function capabilitySecret(value: unknown, label: string): string {
  const secret = secureString(value, label, 43, 43);
  if (!/^[A-Za-z0-9_-]{43}$/u.test(secret)) throw new Error(`${label} must be canonical base64url`);
  const decoded = Buffer.from(secret, "base64url");
  if (decoded.byteLength !== 32 || decoded.toString("base64url") !== secret) {
    throw new Error(`${label} must encode exactly 32 bytes as canonical unpadded base64url`);
  }
  return secret;
}

function idempotencyKey(value: unknown, label: string): string {
  const key = secureString(value, label, 22, 256);
  if (!/^(?:[A-Fa-f0-9]{32,}|[A-Za-z0-9_-]{22,})$/u.test(key)) {
    throw new Error(`${label} must be a canonical key with at least 128 bits`);
  }
  return key;
}

function parseSecureJson(io: R4CliIo, label: string): Record<string, unknown> {
  return record(parseStrictJson(io.readSecret(0)), label);
}

function parseCapability(value: Record<string, unknown>, label: string): GuestCapabilityInput {
  exactKeys(value, ["schemaVersion", "capabilityId", "capabilitySecret"], label);
  if (value.schemaVersion !== "guest_capability_input.v1") throw new Error(`${label}.schemaVersion is invalid`);
  const capabilityId = secureString(value.capabilityId, `${label}.capabilityId`, 16, 256);
  if (!/^[a-z][a-z0-9_-]{15,255}$/u.test(capabilityId)) throw new Error(`${label}.capabilityId is invalid`);
  return { capabilityId, capabilitySecret: capabilitySecret(value.capabilitySecret, `${label}.capabilitySecret`) };
}

function generatedSecret(): string {
  return randomBytes(32).toString("base64url");
}

function generatedIdempotencyKey(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString("base64url")}`;
}

function parseAskRecovery(value: unknown): GuestAskRecoveryV1 {
  if (value === null) {
    return {
      schemaVersion: "guest_ask_recovery.v1",
      idempotencyKey: generatedIdempotencyKey("ask"),
      replySecret: generatedSecret(),
      deleteSecret: generatedSecret(),
    };
  }
  const input = record(value, "guest ask recovery");
  exactKeys(input, ["schemaVersion", "idempotencyKey", "replySecret", "deleteSecret"], "guest ask recovery");
  if (input.schemaVersion !== "guest_ask_recovery.v1") throw new Error("guest ask recovery schemaVersion is invalid");
  return {
    schemaVersion: "guest_ask_recovery.v1",
    idempotencyKey: idempotencyKey(input.idempotencyKey, "guest ask recovery idempotencyKey"),
    replySecret: capabilitySecret(input.replySecret, "guest ask recovery replySecret"),
    deleteSecret: capabilitySecret(input.deleteSecret, "guest ask recovery deleteSecret"),
  };
}

function parseAskInput(io: R4CliIo): GuestAskMutation {
  const input = parseSecureJson(io, "guest ask input");
  exactKeys(input, ["schemaVersion", "capabilityId", "capabilitySecret", "interactionType", "requestText", "guestCapsule", "recovery"], "guest ask input");
  if (input.schemaVersion !== "guest_ask_input.v1") throw new Error("guest ask input schemaVersion is invalid");
  if (input.interactionType !== "ask" && input.interactionType !== "seed" && input.interactionType !== "resonance") {
    throw new Error("guest ask interactionType is invalid");
  }
  const requestText = secureString(input.requestText, "guest ask requestText", 1, 12 * 1_024);
  const guestCapsule = input.guestCapsule === null ? null : validateGuestCapsuleV1(input.guestCapsule);
  const capability = parseCapability({
    schemaVersion: "guest_capability_input.v1",
    capabilityId: input.capabilityId,
    capabilitySecret: input.capabilitySecret,
  }, "guest ask capability");
  const recovery = parseAskRecovery(input.recovery);
  if (new Set([capability.capabilitySecret, recovery.replySecret, recovery.deleteSecret]).size !== 3) {
    throw new Error("guest ask capability, reply, and delete secrets must be distinct");
  }
  return {
    ...capability,
    interactionType: input.interactionType,
    requestText,
    guestCapsule,
    recovery,
  };
}

function parseAgentTokenInput(io: R4CliIo): GuestAgentTokenMutation {
  const input = parseSecureJson(io, "guest agent-token input");
  exactKeys(input, ["schemaVersion", "capabilityId", "capabilitySecret", "recovery"], "guest agent-token input");
  if (input.schemaVersion !== "guest_agent_token_input.v1") throw new Error("guest agent-token input schemaVersion is invalid");
  const capability = parseCapability({
    schemaVersion: "guest_capability_input.v1",
    capabilityId: input.capabilityId,
    capabilitySecret: input.capabilitySecret,
  }, "guest agent-token capability");
  let recovery: GuestAgentTokenRecoveryV1;
  if (input.recovery === null) {
    recovery = {
      schemaVersion: "guest_agent_token_recovery.v1",
      idempotencyKey: generatedIdempotencyKey("agent"),
      derivativeSecret: generatedSecret(),
      replySecret: generatedSecret(),
      deleteSecret: generatedSecret(),
    };
  } else {
    const existing = record(input.recovery, "guest agent-token recovery");
    exactKeys(existing, ["schemaVersion", "idempotencyKey", "derivativeSecret", "replySecret", "deleteSecret"], "guest agent-token recovery");
    if (existing.schemaVersion !== "guest_agent_token_recovery.v1") throw new Error("guest agent-token recovery schemaVersion is invalid");
    recovery = {
      schemaVersion: "guest_agent_token_recovery.v1",
      idempotencyKey: idempotencyKey(existing.idempotencyKey, "guest agent-token recovery idempotencyKey"),
      derivativeSecret: capabilitySecret(existing.derivativeSecret, "guest agent-token recovery derivativeSecret"),
      replySecret: capabilitySecret(existing.replySecret, "guest agent-token recovery replySecret"),
      deleteSecret: capabilitySecret(existing.deleteSecret, "guest agent-token recovery deleteSecret"),
    };
  }
  if (new Set([
    capability.capabilitySecret,
    recovery.derivativeSecret,
    recovery.replySecret,
    recovery.deleteSecret,
  ]).size !== 4) {
    throw new Error("guest agent-token parent, derivative, reply, and delete secrets must be distinct");
  }
  return { ...capability, recovery };
}

export function guestAgentTokenSecretBundle(
  recovery: GuestAgentTokenRecoveryV1,
): GuestAgentTokenSecretBundleV1 {
  return {
    schemaVersion: "guest_agent_token_secret_bundle.v1",
    manualRecovery: structuredClone(recovery),
    agentShare: {
      schemaVersion: "guest_agent_token_share.v1",
      derivativeSecret: recovery.derivativeSecret,
    },
  };
}

export async function runR4Cli(args: string[], environment: R4CliEnvironment, io: R4CliIo): Promise<void> {
  const [family, action, ...rest] = args;
  if (family === "room") {
    if (action === "pair") {
      exactArgs(rest, 0, "forme room pair");
      const pairingCode = io.readSecret(0).trim();
      if (!pairingCode) throw new Error("pairing code is required on the secure input descriptor");
      const result = await environment.room.pair({ pairingCode });
      assertBodyFree(result);
      io.stdout(oneLineJson(result));
      return;
    }
    if (action === "status") {
      exactArgs(rest, 0, "forme room status");
      const result = await environment.room.status();
      assertBodyFree(result);
      io.stdout(oneLineJson(result));
      return;
    }
    if (action === "sync") {
      exactArgs(rest, 0, "forme room sync");
      const result = await environment.room.sync();
      assertBodyFree(result);
      io.stdout(oneLineJson(result));
      return;
    }
    if (action === "prepare-response") {
      exactArgs(rest, 1, "forme room prepare-response <interaction-id>");
      const interactionId = rest[0];
      if (!interactionId || !/^interaction_[A-Za-z0-9_-]{16,128}$/u.test(interactionId)) throw new Error("invalid Interaction ID");
      const result = await environment.room.prepareResponse(interactionId);
      assertBodyFree(result);
      io.stdout(oneLineJson(result));
      return;
    }
    if (action === "reconcile") {
      exactArgs(rest, 0, "forme room reconcile");
      const result = await environment.room.reconcile();
      assertBodyFree(result);
      io.stdout(oneLineJson(result));
      return;
    }
    throw new Error("usage: forme room pair|status|sync|prepare-response|reconcile");
  }

  if (family === "guest") {
    if (action === "inspect") {
      exactArgs(rest, 0, "forme guest inspect");
      const result = await environment.guest.inspect(parseCapability(parseSecureJson(io, "guest inspect input"), "guest inspect input"));
      assertBodyFree(result);
      io.stdout(oneLineJson(result));
      return;
    }
    if (action === "ask") {
      exactArgs(rest, 0, "forme guest ask");
      const input = parseAskInput(io);
      io.writeSecret(oneLineJson(input.recovery));
      const result = await environment.guest.ask(input);
      assertBodyFree(result);
      io.stdout(oneLineJson(result));
      return;
    }
    if (action === "status") {
      exactArgs(rest, 0, "forme guest status");
      const result = await environment.guest.status(parseCapability(parseSecureJson(io, "guest status input"), "guest status input"));
      assertBodyFree(result);
      io.stdout(oneLineJson(result));
      return;
    }
    if (action === "delete") {
      exactArgs(rest, 0, "forme guest delete");
      const result = await environment.guest.delete(parseCapability(parseSecureJson(io, "guest delete input"), "guest delete input"));
      assertBodyFree(result);
      io.stdout(oneLineJson(result));
      return;
    }
    if (action === "agent-token") {
      exactArgs(rest, 0, "forme guest agent-token");
      const input = parseAgentTokenInput(io);
      io.writeSecret(oneLineJson(guestAgentTokenSecretBundle(input.recovery)));
      const receipt = await environment.guest.mintAgentToken(input);
      assertBodyFree(receipt);
      io.stdout(oneLineJson(receipt));
      return;
    }
    throw new Error("usage: forme guest inspect|ask|status|delete|agent-token");
  }
  throw new Error("unknown R4 CLI family");
}

/**
 * Active Core CLI. Historical Full tests continue to use `runR4Cli`, while
 * the installable binary enters here so Full-only Agent derivative minting is
 * absent and every Core API operation has one closed secure-descriptor path.
 */
export async function runR4CoreCli(args: string[], environment: R4CliEnvironment, io: R4CliIo): Promise<void> {
  const [family, action, ...rest] = args;
  if (family === "room" && action === "api") {
    exactArgs(rest, 1, "forme room api <core-operation>");
    const actionName = rest[0];
    if (!actionName) throw new Error("Core Room API action is required");
    const parsed = parseCoreRoomApiSecureInput(actionName, parseStrictJson(io.readSecret(0)));
    const result = await environment.room.api(parsed);
    io.writeSecret(oneLineJson(result));
    io.stdout(oneLineJson({
      schemaVersion: "forme.room.core-api-cli-receipt.v1",
      action: parsed.action,
      resultWrittenToSecureOutput: true,
    }));
    return;
  }
  if (family === "guest" && action === "agent-token") {
    throw new Error("usage: forme guest inspect|ask|status|delete");
  }
  await runR4Cli(args, environment, io);
}

export function processIo(): R4CliIo {
  return {
    stdout: (value) => console.log(value),
    stderr: (value) => console.error(value),
    readSecret: (fd) => readFileSync(fd, "utf8"),
    writeSecret: (value) => {
      const configured = process.env.FORME_SECRET_OUT_FD;
      const fd = configured === undefined ? Number.NaN : Number(configured);
      if (!Number.isSafeInteger(fd) || fd < 3) throw new Error("a secure token output descriptor is not configured");
      writeFileSync(fd, `${value}\n`, { encoding: "utf8" });
    },
  };
}

function unavailable(): never {
  throw new Error("R4 adapter is not configured; Gate A permits synthetic/local adapters only");
}

export function unavailableR4Environment(): R4CliEnvironment {
  return {
    room: {
      pair: async () => unavailable(),
      status: async () => unavailable(),
      sync: async () => unavailable(),
      prepareResponse: async () => unavailable(),
      reconcile: async () => unavailable(),
      api: async () => unavailable(),
    },
    guest: {
      inspect: async () => unavailable(),
      ask: async () => unavailable(),
      status: async () => unavailable(),
      delete: async () => unavailable(),
      mintAgentToken: async () => unavailable(),
    },
  };
}
