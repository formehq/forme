import crypto from "node:crypto";

const terminals = new Map([
  ["approve", [0, "approve_exact", 1, 1]],
  ["discard", [0, "discard", 1, 0]],
  ["expired", [0, "authority_expired", 0, 0]],
  ["controlled", [70, "controlled_failure", 0, 0]],
]);
const [mode] = process.argv.slice(2);
if (mode === "pipe-reader") {
  const chunks = [];
  process.stdin.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  process.stdin.on("end", () => {
    const bytes = Buffer.concat(chunks);
    for (const chunk of chunks) chunk.fill(0);
    const digest = `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
    process.stdout.write(`${JSON.stringify({ schemaVersion: "r4.gate-b-core.fake-pipe-observation.v1", bytes: bytes.length, sha256: digest })}\n`);
    bytes.fill(0);
  });
} else {
if (["pre-receipt-death", "before-read", "mid-read", "before-la"].includes(mode)) process.exit(64);
if (["during-la", "during-review", "post-count-death"].includes(mode)) process.kill(process.pid, "SIGKILL");
const row = terminals.get(mode);
if (!row && !["partial-receipt", "duplicate-receipt", "oversize-receipt", "trailing-receipt", "wrong-exit", "stderr", "post-receipt-death"].includes(mode)) process.exit(64);
const malformedBase = terminals.get("approve");
if (!row) {
  const [exitCode, terminal, presence, handoff] = malformedBase;
  const receipt = {
    aggregateVerdict: "YELLOW", bodyBearingHandoffOutsideHelper: 0, candidateBodyFilesCreated: 0,
    candidateBodyStderrBytes: 0, candidateBodyStdoutBytes: 0, cleanupPassed: true,
    controlledZeroizationPassed: true, crashZeroizationClaimed: false, fullPersistentLaneStatusChanged: false,
    handoffCount: handoff, networkCalls: 0, persistentCandidateRecoverySupported: false,
    presenceCeremonies: presence, providerCalls: 0, reasonCode: terminal,
    schemaVersion: "r4.gate-b-core.macos-helper-receipt.v1", terminal,
  };
  const bytes = `${JSON.stringify(receipt)}\n`;
  if (mode === "partial-receipt") process.stdout.write(bytes.slice(0, Math.floor(bytes.length / 2)));
  else if (mode === "duplicate-receipt") process.stdout.write(`${bytes}${bytes}`);
  else if (mode === "oversize-receipt") process.stdout.write("x".repeat(4097));
  else if (mode === "trailing-receipt") process.stdout.write(`${bytes}x`);
  else if (mode === "stderr") { process.stdout.write(bytes); process.stderr.write("synthetic stderr"); }
  else { process.stdout.write(bytes); if (mode === "post-receipt-death") process.kill(process.pid, "SIGKILL"); }
  process.exit(mode === "wrong-exit" ? 69 : exitCode);
}
const [exitCode, terminal, presence, handoff] = row;
const receipt = {
  aggregateVerdict: "YELLOW",
  bodyBearingHandoffOutsideHelper: 0,
  candidateBodyFilesCreated: 0,
  candidateBodyStderrBytes: 0,
  candidateBodyStdoutBytes: 0,
  cleanupPassed: true,
  controlledZeroizationPassed: true,
  crashZeroizationClaimed: false,
  fullPersistentLaneStatusChanged: false,
  handoffCount: handoff,
  networkCalls: 0,
  persistentCandidateRecoverySupported: false,
  presenceCeremonies: presence,
  providerCalls: 0,
  reasonCode: terminal,
  schemaVersion: "r4.gate-b-core.macos-helper-receipt.v1",
  terminal,
};
process.stdout.write(`${JSON.stringify(receipt)}\n`);
process.exit(exitCode);
}
