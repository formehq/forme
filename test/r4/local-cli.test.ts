import assert from "node:assert/strict";
import test from "node:test";
import {
  runR4Cli,
  type GuestAgentTokenMutation,
  type GuestAskMutation,
  type GuestCapabilityInput,
  type R4CliEnvironment,
  type R4CliIo,
} from "../../packages/r4-local/src/index.ts";
import { sha256 } from "../../packages/r4-local/src/index.ts";

const CAPABILITY_ID = "grant_syntheticclicapability000001";

function canonicalSecret(byte: number): string {
  return Buffer.alloc(32, byte).toString("base64url");
}

const CAPABILITY_SECRET = canonicalSecret(42);

function bodyFreeReceipt(operation: string) {
  return {
    schemaVersion: "synthetic_cli_receipt.v1",
    receiptId: `receipt_${operation}synthetic000000000001`,
    operation,
    requestHash: sha256(operation),
    outcome: "accepted",
  };
}

function ioFor(input: unknown, trace: string[] = []) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const secrets: string[] = [];
  const io: R4CliIo = {
    stdout(value) { trace.push("stdout"); stdout.push(value); },
    stderr(value) { trace.push("stderr"); stderr.push(value); },
    readSecret(fd) {
      assert.equal(fd, 0);
      trace.push("read-secret");
      return JSON.stringify(input);
    },
    writeSecret(value) { trace.push("write-secret"); secrets.push(value); },
  };
  return { io, stdout, stderr, secrets };
}

function environment(overrides: Partial<R4CliEnvironment["guest"]> = {}): R4CliEnvironment {
  return {
    room: {
      async pair() { return bodyFreeReceipt("pair"); },
      async status() { return bodyFreeReceipt("room-status"); },
      async sync() { return bodyFreeReceipt("sync"); },
      async prepareResponse() { return bodyFreeReceipt("prepare-response"); },
      async reconcile() { return bodyFreeReceipt("reconcile"); },
    },
    guest: {
      async inspect() { return bodyFreeReceipt("inspect"); },
      async ask() { return bodyFreeReceipt("ask"); },
      async status() { return bodyFreeReceipt("guest-status"); },
      async delete() { return bodyFreeReceipt("delete"); },
      async mintAgentToken() { return bodyFreeReceipt("agent-token"); },
      ...overrides,
    },
  };
}

function capabilityInput() {
  return {
    schemaVersion: "guest_capability_input.v1",
    capabilityId: CAPABILITY_ID,
    capabilitySecret: CAPABILITY_SECRET,
  };
}

test("Guest read/delete commands require a typed secure capability and print only body-free results", async () => {
  for (const action of ["inspect", "status", "delete"] as const) {
    let observed: GuestCapabilityInput | null = null;
    const fixture = ioFor(capabilityInput());
    await runR4Cli(["guest", action], environment({
      [action]: async (input: GuestCapabilityInput) => {
        observed = input;
        return bodyFreeReceipt(action);
      },
    }), fixture.io);
    assert.deepEqual(observed, { capabilityId: CAPABILITY_ID, capabilitySecret: CAPABILITY_SECRET });
    assert.equal(fixture.stdout.length, 1);
    assert.doesNotMatch(fixture.stdout[0]!, new RegExp(CAPABILITY_SECRET, "u"));
  }
});

test("Guest ask writes client-generated reply/delete recovery before mutation and survives a lost response", async () => {
  const trace: string[] = [];
  let firstMutation: GuestAskMutation | null = null;
  const first = ioFor({
    schemaVersion: "guest_ask_input.v1",
    capabilityId: CAPABILITY_ID,
    capabilitySecret: CAPABILITY_SECRET,
    interactionType: "ask",
    requestText: "Synthetic private request that must never reach stdout.",
    guestCapsule: null,
    recovery: null,
  }, trace);
  await assert.rejects(() => runR4Cli(["guest", "ask"], environment({
    async ask(input) {
      trace.push("remote-mutation");
      firstMutation = input;
      throw new Error("synthetic response lost after commit");
    },
  }), first.io), /response lost/u);
  assert.deepEqual(trace.slice(-2), ["write-secret", "remote-mutation"]);
  assert.equal(first.stdout.length, 0);
  assert.equal(first.secrets.length, 1);
  const recovery = JSON.parse(first.secrets[0]!) as GuestAskMutation["recovery"];
  assert.match(recovery.replySecret, /^[A-Za-z0-9_-]{43}$/u);
  assert.match(recovery.deleteSecret, /^[A-Za-z0-9_-]{43}$/u);
  assert.notEqual(recovery.replySecret, recovery.deleteSecret);

  let retryMutation: GuestAskMutation | null = null;
  const retry = ioFor({
    schemaVersion: "guest_ask_input.v1",
    capabilityId: CAPABILITY_ID,
    capabilitySecret: CAPABILITY_SECRET,
    interactionType: "ask",
    requestText: "Synthetic private request that must never reach stdout.",
    guestCapsule: null,
    recovery,
  });
  await runR4Cli(["guest", "ask"], environment({
    async ask(input) {
      retryMutation = input;
      return bodyFreeReceipt("ask");
    },
  }), retry.io);
  assert.deepEqual(retryMutation, firstMutation);
  assert.deepEqual(JSON.parse(retry.secrets[0]!), recovery);
  assert.equal(retry.stdout.length, 1);
  assert.doesNotMatch(retry.stdout[0]!, /Synthetic private request|replySecret|deleteSecret/u);
});

test("Agent derivative, reply, and delete secrets are distinct, Manual-persisted before mutation, and Agent share is narrow", async () => {
  const trace: string[] = [];
  let mutation: GuestAgentTokenMutation | null = null;
  const fixture = ioFor({
    schemaVersion: "guest_agent_token_input.v1",
    capabilityId: CAPABILITY_ID,
    capabilitySecret: CAPABILITY_SECRET,
    recovery: null,
  }, trace);
  await runR4Cli(["guest", "agent-token"], environment({
    async mintAgentToken(input) {
      trace.push("remote-mutation");
      mutation = input;
      return bodyFreeReceipt("agent-token");
    },
  }), fixture.io);
  assert.deepEqual(trace.slice(-3), ["write-secret", "remote-mutation", "stdout"]);
  assert.match(mutation!.recovery.derivativeSecret, /^[A-Za-z0-9_-]{43}$/u);
  assert.match(mutation!.recovery.replySecret, /^[A-Za-z0-9_-]{43}$/u);
  assert.match(mutation!.recovery.deleteSecret, /^[A-Za-z0-9_-]{43}$/u);
  assert.equal(new Set([
    CAPABILITY_SECRET,
    mutation!.recovery.derivativeSecret,
    mutation!.recovery.replySecret,
    mutation!.recovery.deleteSecret,
  ]).size, 4);
  const bundle = JSON.parse(fixture.secrets[0]!) as {
    manualRecovery: GuestAgentTokenMutation["recovery"];
    agentShare: { schemaVersion: string; derivativeSecret: string };
  };
  assert.deepEqual(bundle.manualRecovery, mutation!.recovery);
  assert.deepEqual(bundle.agentShare, {
    schemaVersion: "guest_agent_token_share.v1",
    derivativeSecret: mutation!.recovery.derivativeSecret,
  });
  assert.doesNotMatch(JSON.stringify(bundle.agentShare), /replySecret|deleteSecret/u);
  assert.doesNotMatch(fixture.stdout[0]!, /derivativeSecret|replySecret|deleteSecret|agent_/u);

  let retryMutation: GuestAgentTokenMutation | null = null;
  const retry = ioFor({
    schemaVersion: "guest_agent_token_input.v1",
    capabilityId: CAPABILITY_ID,
    capabilitySecret: CAPABILITY_SECRET,
    recovery: bundle.manualRecovery,
  });
  await runR4Cli(["guest", "agent-token"], environment({
    async mintAgentToken(input) {
      retryMutation = input;
      return bodyFreeReceipt("agent-token");
    },
  }), retry.io);
  assert.deepEqual(retryMutation, mutation);
  assert.deepEqual((JSON.parse(retry.secrets[0]!) as { manualRecovery: unknown }).manualRecovery, bundle.manualRecovery);
});

test("CLI capability boundary rejects noncanonical, short, long, reused, and malformed recovery secrets", async () => {
  for (const capabilitySecret of [
    "a".repeat(42),
    Buffer.alloc(33, 7).toString("base64url"),
    `${canonicalSecret(8)}=`,
    "!".repeat(43),
  ]) {
    const fixture = ioFor({ ...capabilityInput(), capabilitySecret });
    await assert.rejects(() => runR4Cli(["guest", "status"], environment(), fixture.io), /canonical|32 bytes|invalid/u);
  }

  const reused = ioFor({
    schemaVersion: "guest_agent_token_input.v1",
    capabilityId: CAPABILITY_ID,
    capabilitySecret: CAPABILITY_SECRET,
    recovery: {
      schemaVersion: "guest_agent_token_recovery.v1",
      idempotencyKey: "agent_retry_key_0000000000000001",
      derivativeSecret: canonicalSecret(1),
      replySecret: canonicalSecret(1),
      deleteSecret: canonicalSecret(2),
    },
  });
  await assert.rejects(() => runR4Cli(["guest", "agent-token"], environment(), reused.io), /must be distinct/u);
});

test("CLI rejects unknown secure-input fields and body/secret-bearing stdout", async () => {
  const extra = ioFor({ ...capabilityInput(), extra: true });
  await assert.rejects(() => runR4Cli(["guest", "status"], environment(), extra.io), /unknown or missing/u);

  const leaky = ioFor(capabilityInput());
  await assert.rejects(() => runR4Cli(["guest", "status"], environment({
    async status() { return { responseText: "forbidden" }; },
  }), leaky.io), /body-free contract/u);
  assert.equal(leaky.stdout.length, 0);
});
