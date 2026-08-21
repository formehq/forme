import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { canonicalJson } from "../../packages/r4-protocol/src/index.ts";
import {
  buildExactResponseLiveSocketEnvelopeV1,
// The bounded ceremony is an executable .mjs artifact; importing it here
// exercises the same envelope used by the Owner touchpoint.
// @ts-expect-error -- intentional executable artifact import.
} from "../../scripts/r4-exact-response-live-socket-rehearsal.mjs";

const OWNER_RESPONSE = "The project should prioritize completing the controlled-presence loop.";
const SOURCE = readFileSync("scripts/r4-exact-response-live-socket-rehearsal.mjs", "utf8");
const NETWORK_SOURCE = readFileSync("scripts/allow-loopback-only-network.mjs", "utf8");

test("#69 live-socket envelope is deterministic, body-free and grants only one loopback Next process", () => {
  const first = buildExactResponseLiveSocketEnvelopeV1();
  const second = buildExactResponseLiveSocketEnvelopeV1();
  assert.deepEqual(second, first);
  assert.match(first.envelopeHash, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(first.envelope.origin.transport, "next_process_tcp_http_loopback");
  assert.equal(first.envelope.authority.nextProcessLimit, 1);
  assert.equal(first.envelope.authority.syntheticLoopbackSemanticCommitLimit, 1);
  assert.equal(first.envelope.authority.externalNetworkCalls, 0);
  assert.equal(first.envelope.authority.durablePublicCoreAuthority, false);
  assert.equal(first.envelope.authority.hostedServerAuthority, false);
  assert.equal(first.envelope.response.persistedCandidateBytes, 0);
  assert.doesNotMatch(canonicalJson(first), new RegExp(OWNER_RESPONSE, "u"));
});

test("#69 live Next entry is loopback-only, cleanup-owned and keeps Owner text out of code and ledgers", () => {
  assert.match(SOURCE, /"--hostname",\s*"127\.0\.0\.1"/u);
  assert.match(SOURCE, /NEXT_TELEMETRY_DISABLED: "1"/u);
  assert.match(SOURCE, /NODE_OPTIONS: `--import=\$\{LOOPBACK_ONLY_NETWORK\}`/u);
  assert.match(SOURCE, /detached: true/u);
  assert.match(SOURCE, /process\.kill\(-child\.pid, "SIGTERM"\)/u);
  assert.match(SOURCE, /process\.kill\(-child\.pid, "SIGKILL"\)/u);
  assert.match(SOURCE, /faultAt: "after_submit"/u);
  assert.match(SOURCE, /responseEvents\.length !== 1/u);
  assert.match(SOURCE, /flag: exclusive \? "wx" : "w"/u);
  assert.doesNotMatch(SOURCE, /api\.openai\.com|OPENAI_API_KEY|CODEX_API_KEY/u);
  assert.doesNotMatch(SOURCE, new RegExp(OWNER_RESPONSE, "u"));
  assert.match(NETWORK_SOURCE, /host === "127\.0\.0\.1" \|\| host === "::1" \|\| host === "localhost"/u);
  assert.match(NETWORK_SOURCE, /dgram\.createSocket = deny/u);
  assert.match(NETWORK_SOURCE, /dns\.resolve = deny/u);
  assert.match(NETWORK_SOURCE, /net\.Socket\.prototype\.connect/u);
  assert.match(NETWORK_SOURCE, /dnsPromises\.resolve = deny/u);
});

test("live-loopback child policy permits local TCP and synchronously denies a non-loopback target", () => {
  const script = `
    const net = require("node:net");
    const server = net.createServer((socket) => socket.end("ok"));
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      const client = net.connect({ host: "127.0.0.1", port });
      client.once("data", () => {
        let denied = false;
        try { new net.Socket().connect({ host: "198.51.100.1", port: 80 }); } catch { denied = true; }
        server.close(() => process.exit(denied ? 0 : 2));
      });
    });
  `;
  const result = spawnSync(process.execPath, [
    "--import",
    "./scripts/allow-loopback-only-network.mjs",
    "-e",
    script,
  ], { cwd: process.cwd(), encoding: "utf8", timeout: 5_000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.signal, null);
});
