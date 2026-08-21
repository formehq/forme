import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  FRESH_CANDIDATE_BASE_INSTRUCTIONS,
  FRESH_CANDIDATE_MAX_INPUT_TOKENS,
  FRESH_CANDIDATE_MAX_OUTPUT_TOKENS,
  FRESH_CANDIDATE_MODEL,
  FRESH_CANDIDATE_OUTPUT_SCHEMA,
  FRESH_CANDIDATE_REASONING_EFFORT,
  FRESH_CANDIDATE_WALL_CLOCK_SECONDS,
  buildSyntheticFreshCandidatePreflightPrompt,
} from "../packages/r4-codex-adapter/src/index.ts";
import { canonicalJson, canonicalSha256, parseStrictJson } from "../packages/r4-protocol/src/index.ts";
import { CodexExecRuntime } from "../src/runtime.ts";

const ledgerRoot = path.resolve(".forme/r4-fresh-codex-exec-envelopes");

function fail(code) {
  throw new Error(code);
}

function appleScriptString(value) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function runDialog(script, failureCode) {
  const result = spawnSync("/usr/bin/osascript", ["-"], {
    input: script,
    encoding: "utf8",
    maxBuffer: 32 * 1_024,
    env: { PATH: "/usr/bin:/bin" },
  });
  if (result.status !== 0 || result.signal !== null) fail(failureCode);
  return result.stdout.replace(/\r?\n$/u, "");
}

function reviewCandidate(responseText) {
  const explanation = [
    "Untrusted local candidate — no publication authority.",
    "Approve exact records only your #68 candidate judgment; it does not publish, mutate a Room, or start #69.",
    "",
    responseText,
  ].join("\n");
  try {
    const button = runDialog(`tell application "System Events"
activate
set reviewDialog to display dialog ${appleScriptString(explanation)} buttons {"Discard", "Approve exact"} default button "Discard" with title "Forme #68 — Codex CLI candidate review"
return button returned of reviewDialog
end tell\n`, "FRESH_CODEX_EXEC_REVIEW_CANCELLED");
    return button === "Approve exact" ? "approve_exact" : "discard";
  } catch {
    return "discard";
  }
}

function writeLedger(ledgerPath, value, exclusive = false) {
  mkdirSync(ledgerRoot, { recursive: true, mode: 0o700 });
  chmodSync(ledgerRoot, 0o700);
  writeFileSync(ledgerPath, `${canonicalJson(value)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: exclusive ? "wx" : "w",
  });
}

function buildRun() {
  const prompt = buildSyntheticFreshCandidatePreflightPrompt();
  const packet = {
    schemaVersion: "r4.fresh_candidate_codex_exec_packet.v1",
    orientation: parseStrictJson(prompt.orientationText),
    interactionAndSnapshot: parseStrictJson(prompt.userPayloadText),
  };
  const runtimePrompt = [
    FRESH_CANDIDATE_BASE_INSTRUCTIONS,
    "Use only the structured packet supplied on stdin.",
    "Do not call any tool or request additional context.",
  ].join(" ");
  const envelope = {
    schemaVersion: "r4.fresh_candidate_codex_exec_envelope.v1",
    issue: 68,
    sourceManifestHash: prompt.sourceManifestHash,
    orientationHash: prompt.orientationHash,
    packetHash: canonicalSha256(packet),
    promptHash: canonicalSha256(runtimePrompt),
    outputSchemaHash: canonicalSha256(FRESH_CANDIDATE_OUTPUT_SCHEMA),
    runtime: {
      carrier: "codex_exec_saved_chatgpt_auth",
      model: FRESH_CANDIDATE_MODEL,
      reasoningEffort: FRESH_CANDIDATE_REASONING_EFFORT,
      freshEphemeralTranscript: true,
      resumeAllowed: false,
      cliInvocationLimit: 1,
      wallClockSeconds: FRESH_CANDIDATE_WALL_CLOCK_SECONDS,
      inputTokenAuditCeiling: FRESH_CANDIDATE_MAX_INPUT_TOKENS,
      outputTokenAuditCeiling: FRESH_CANDIDATE_MAX_OUTPUT_TOKENS,
      responseTextCharacterCeiling: FRESH_CANDIDATE_MAX_OUTPUT_TOKENS,
      userConfigLoaded: false,
      projectRulesLoaded: false,
      packetRootAccess: "managed_read_only",
      toolEventsAllowed: false,
      providerRequestBytesExact: false,
      providerDispatchCountProvable: false,
      apiSpendCapProvable: false,
    },
    effects: {
      publicationAuthority: false,
      roomMutationAuthority: false,
      connectorAuthority: false,
      retryAuthority: false,
    },
  };
  const envelopeHash = canonicalSha256(envelope);
  return { envelope, envelopeHash, packet, runtimePrompt };
}

function inspect(run) {
  return {
    schemaVersion: "r4.fresh_candidate_codex_exec_inspection.v1",
    issue: 68,
    envelopeHash: run.envelopeHash,
    envelope: run.envelope,
    candidateBodyBytes: 0,
    providerCalls: 0,
  };
}

const run = buildRun();
if (process.argv.length === 3 && process.argv[2] === "inspect") {
  process.stdout.write(`${canonicalJson(inspect(run))}\n`);
} else if (
  process.platform === "darwin"
  && process.argv.length === 4
  && process.argv[2] === "execute-once"
  && process.argv[3] === run.envelopeHash
) {
  const ledgerPath = path.join(ledgerRoot, `${run.envelopeHash.slice("sha256:".length)}.json`);
  try {
    writeLedger(ledgerPath, {
      schemaVersion: "r4.fresh_candidate_codex_exec_ledger.v1",
      issue: 68,
      envelopeHash: run.envelopeHash,
      state: "cli_started",
      cliInvocationLimit: 1,
      retryAuthority: false,
      publicationAuthority: false,
    }, true);
    const runtime = new CodexExecRuntime({
      model: FRESH_CANDIDATE_MODEL,
      timeoutMs: FRESH_CANDIDATE_WALL_CLOCK_SECONDS * 1_000,
    });
    const result = runtime.generateStructuredPacket({
      packet: run.packet,
      schema: FRESH_CANDIDATE_OUTPUT_SCHEMA,
      schemaFilename: "fresh-candidate-output.schema.json",
      packetFilename: "fresh-candidate-packet.json",
      prompt: run.runtimePrompt,
    });
    const candidate = result.proposal;
    if (
      candidate === null
      || typeof candidate !== "object"
      || Array.isArray(candidate)
      || Object.keys(candidate).length !== 1
      || typeof candidate.responseText !== "string"
      || candidate.responseText.length < 1
      || candidate.responseText.length > FRESH_CANDIDATE_MAX_OUTPUT_TOKENS
    ) fail("FRESH_CODEX_EXEC_CANDIDATE_INVALID");
    if (result.audit.inputTokens > FRESH_CANDIDATE_MAX_INPUT_TOKENS) fail("FRESH_CODEX_EXEC_INPUT_AUDIT_EXCEEDED");
    if (result.audit.outputTokens > FRESH_CANDIDATE_MAX_OUTPUT_TOKENS) fail("FRESH_CODEX_EXEC_OUTPUT_AUDIT_EXCEEDED");
    const decision = reviewCandidate(candidate.responseText);
    const bodyFreeResult = {
      schemaVersion: "r4.fresh_candidate_codex_exec_owner_review.v1",
      issue: 68,
      verdict: "GREEN_CODEX_EXEC_OWNER_REVIEWED",
      envelopeHash: run.envelopeHash,
      decision,
      runtime: {
        cliVersion: result.cliVersion,
        model: result.model,
        cliInvocations: 1,
        resumedSessions: 0,
        toolEventCount: result.audit.toolEventCount,
        inputTokens: result.audit.inputTokens,
        outputTokens: result.audit.outputTokens,
      },
      candidateHash: canonicalSha256(candidate.responseText),
      effects: { publicationCalls: 0, roomMutationCalls: 0, connectorCalls: 0 },
      candidate: { bodyOutputBytes: 0, persistedBodyBytes: 0 },
    };
    writeLedger(ledgerPath, {
      schemaVersion: "r4.fresh_candidate_codex_exec_ledger.v1",
      issue: 68,
      envelopeHash: run.envelopeHash,
      state: "completed",
      result: bodyFreeResult,
    });
    process.stdout.write(`${canonicalJson(bodyFreeResult)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "FRESH_CODEX_EXEC_FAILED"}\n`);
    process.exitCode = 1;
  }
} else {
  process.stderr.write(`usage: node scripts/r4-fresh-candidate-codex-exec.mjs inspect | execute-once ${run.envelopeHash}\n`);
  process.exitCode = 64;
}
