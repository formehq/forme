import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildExactResponseLocalEnvelope,
  runTransientExactResponseLocalDelivery,
} from "../packages/r4-local/src/index.ts";
import { canonicalJson } from "../packages/r4-protocol/src/index.ts";

const ledgerRoot = path.resolve(".forme/r4-exact-response-local-delivery");
const { envelope, envelopeHash } = buildExactResponseLocalEnvelope();

function fail(code) {
  throw new Error(code);
}

function appleScriptString(value) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function dialog(script, failureCode) {
  const result = spawnSync("/usr/bin/osascript", ["-"], {
    input: script,
    encoding: "utf8",
    maxBuffer: 64 * 1_024,
    env: { PATH: "/usr/bin:/bin" },
  });
  if (result.status !== 0 || result.signal !== null) fail(failureCode);
  return result.stdout.replace(/\r?\n$/u, "");
}

function collectOwnerResponse() {
  return dialog(`tell application "System Events"
activate
set responseDialog to display dialog "Paste the exact Owner-authored public Response for #69. It remains in process memory and is not written to the repository or ledger." default answer "" buttons {"Cancel", "Continue"} default button "Continue" cancel button "Cancel" with title "Forme #69 — exact Response text"
return text returned of responseDialog
end tell\n`, "EXACT_RESPONSE_TEXT_CANCELLED");
}

function candidateReview(input) {
  const preview = [
    "Manual Owner-authored Response — zero model participation.",
    `Room: ${input.roomId}`,
    `Projection: ${input.projectionId}`,
    `Interaction: ${input.interactionId}`,
    `Candidate hash: ${input.candidateHash}`,
    "",
    input.responseText,
  ].join("\n");
  const button = dialog(`tell application "System Events"
activate
set reviewDialog to display dialog ${appleScriptString(preview)} buttons {"Reject", "Approve exact"} default button "Approve exact" with title "Forme #69 — candidate approval"
return button returned of reviewDialog
end tell\n`, "EXACT_RESPONSE_CANDIDATE_REVIEW_CANCELLED");
  return button === "Approve exact" ? "approve_exact" : "reject";
}

function deliveryReview(delivery) {
  const preview = [
    "Complete local synthetic public payload:",
    "",
    canonicalJson(delivery.response),
    "",
    "This performs one in-memory local contract delivery only. No server, public traffic, message or Production effect is authorized.",
  ].join("\n");
  const button = dialog(`tell application "System Events"
activate
set deliveryDialog to display dialog ${appleScriptString(preview)} buttons {"Cancel", "Deliver locally"} default button "Cancel" with title "Forme #69 — final public payload"
return button returned of deliveryDialog
end tell\n`, "EXACT_RESPONSE_DELIVERY_REVIEW_CANCELLED");
  return button === "Deliver locally" ? "deliver_local" : "cancel";
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

if (process.argv.length === 3 && process.argv[2] === "inspect") {
  process.stdout.write(`${canonicalJson({
    schemaVersion: "r4.exact_response_local_inspection.v1",
    issue: 69,
    envelopeHash,
    envelope,
    responseBodyBytes: 0,
    providerCalls: 0,
    localDeliveryCalls: 0,
  })}\n`);
} else if (
  process.platform === "darwin"
  && process.argv.length === 4
  && process.argv[2] === "execute-once"
  && process.argv[3] === envelopeHash
) {
  let responseText = "";
  const ledgerPath = path.join(ledgerRoot, `${envelopeHash.slice("sha256:".length)}.json`);
  try {
    responseText = collectOwnerResponse();
    writeLedger(ledgerPath, {
      schemaVersion: "r4.exact_response_local_ledger.v1",
      issue: 69,
      envelopeHash,
      state: "review_started",
      localDeliveryLimit: 1,
      retryAuthority: false,
      externalEffectAuthority: false,
    }, true);
    const result = runTransientExactResponseLocalDelivery(responseText, {
      reviewCandidate: candidateReview,
      reviewPublicDelivery: deliveryReview,
    });
    writeLedger(ledgerPath, {
      schemaVersion: "r4.exact_response_local_ledger.v1",
      issue: 69,
      envelopeHash,
      state: "completed",
      result,
    });
    process.stdout.write(`${canonicalJson(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "EXACT_RESPONSE_LOCAL_DELIVERY_FAILED"}\n`);
    process.exitCode = 1;
  } finally {
    responseText = "";
  }
} else {
  process.stderr.write(`usage: node scripts/r4-exact-response-local-delivery.mjs inspect | execute-once ${envelopeHash}\n`);
  process.exitCode = 64;
}
