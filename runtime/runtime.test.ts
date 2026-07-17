import assert from "node:assert/strict";
import test from "node:test";
import { CodexAppServerConnection } from "./codex.ts";
import { JsonLineRpcClient } from "./jsonl-rpc.ts";
import { OpenCodeServerConnection, OPENCODE_CAPABILITIES } from "./opencode.ts";
import { CODEX_CAPABILITIES } from "./codex.ts";
import { parseProposalRuntime } from "./index.ts";

test("JSONL RPC matches responses and retains notifications", async () => {
  const script = String.raw`
    const readline = require("node:readline");
    const rl = readline.createInterface({ input: process.stdin });
    rl.on("line", (line) => {
      const message = JSON.parse(line);
      if (message.method === "ping") {
        process.stdout.write(JSON.stringify({ id: message.id, result: { pong: true } }) + "\n");
        process.stdout.write(JSON.stringify({ method: "ready", params: { value: 7 } }) + "\n");
      }
    });
  `;
  const client = new JsonLineRpcClient({ command: process.execPath, args: ["-e", script] });
  try {
    assert.deepEqual(await client.request("ping", {}), { pong: true });
    assert.deepEqual(await client.waitFor("ready"), { value: 7 });
  } finally {
    await client.close();
  }
});

test("Codex App Server adapter initializes and returns a structured final message", async () => {
  const script = String.raw`
    if (process.argv.includes("--version")) {
      console.log("codex-cli test");
      process.exit(0);
    }
    const readline = require("node:readline");
    const rl = readline.createInterface({ input: process.stdin });
    rl.on("line", (line) => {
      const message = JSON.parse(line);
      if (message.method === "initialize") {
        process.stdout.write(JSON.stringify({ id: message.id, result: { serverInfo: { name: "fake" } } }) + "\n");
      }
      if (message.method === "thread/start") {
        process.stdout.write(JSON.stringify({ id: message.id, result: { thread: { id: "thr_test" } } }) + "\n");
      }
      if (message.method === "turn/start") {
        process.stdout.write(JSON.stringify({ id: message.id, result: { turn: { id: "turn_test" } } }) + "\n");
        setTimeout(() => process.stdout.write(JSON.stringify({
          method: "turn/completed",
          params: {
            threadId: "thr_test",
            turn: { id: "turn_test", status: "completed", items: [
              { type: "agentMessage", text: JSON.stringify({ cards: [] }) }
            ] }
          }
        }) + "\n"), 5);
      }
    });
  `;
  const connection = await CodexAppServerConnection.connect({
    command: { command: process.execPath, args: ["-e", script] },
  });
  try {
    const result = await connection.runStructured({
      cwd: process.cwd(),
      prompt: "scan",
      outputSchema: { type: "object" },
    });
    assert.equal(result.runtime, "codex-app-server");
    assert.deepEqual(JSON.parse(result.raw), { cards: [] });
  } finally {
    await connection.close();
  }
});

test("OpenCode adapter authenticates a loopback server and uses structured output", async () => {
  const script = String.raw`
    if (process.argv.includes("--version")) {
      console.log("1.18.1-test");
      process.exit(0);
    }
    const http = require("node:http");
    const server = http.createServer((req, res) => {
      if (!String(req.headers.authorization || "").startsWith("Basic ")) {
        res.writeHead(401).end();
        return;
      }
      const url = new URL(req.url, "http://127.0.0.1");
      let body = "";
      req.on("data", (chunk) => body += chunk);
      req.on("end", () => {
        res.setHeader("content-type", "application/json");
        if (url.pathname === "/global/health") return res.end(JSON.stringify({ healthy: true, version: "1.18.1-test" }));
        if (url.pathname === "/doc") return res.end(JSON.stringify({ openapi: "3.1.0", paths: { "/session": {} } }));
        if (url.pathname === "/session" && req.method === "POST") return res.end(JSON.stringify({ id: "ses_test" }));
        if (url.pathname === "/session/ses_test/message" && req.method === "POST") {
          const parsed = JSON.parse(body);
          if (parsed.format?.type !== "json_schema") return res.writeHead(400).end(JSON.stringify({ error: "format" }));
          return res.end(JSON.stringify({ info: { structured: { cards: [] } }, parts: [] }));
        }
        if (url.pathname === "/session/ses_test" && req.method === "DELETE") return res.end("true");
        res.writeHead(404).end(JSON.stringify({ error: "not found" }));
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      console.log("opencode server listening on http://127.0.0.1:" + address.port);
    });
    process.on("SIGTERM", () => server.close(() => process.exit(0)));
  `;
  const connection = await OpenCodeServerConnection.connect({
    command: { command: process.execPath, args: ["-e", script] },
    isolateState: true,
  });
  try {
    assert.equal(connection.descriptor.health, "ready");
    assert.equal(connection.openApiPathCount, 1);
    const result = await connection.runStructured({
      cwd: process.cwd(),
      prompt: "scan",
      outputSchema: { type: "object" },
    });
    assert.equal(result.runtime, "opencode");
    assert.deepEqual(JSON.parse(result.raw), { cards: [] });
  } finally {
    await connection.close();
  }
});

test("capability matrix keeps runtime policy and OS isolation distinct", () => {
  assert.equal(CODEX_CAPABILITIES.structuredOutput, true);
  assert.equal(CODEX_CAPABILITIES.isolation, "os-sandbox");
  assert.equal(OPENCODE_CAPABILITIES.structuredOutput, true);
  assert.equal(OPENCODE_CAPABILITIES.isolation, "application-permissions");
  assert.equal(parseProposalRuntime(undefined), "codex-exec");
  assert.equal(parseProposalRuntime("opencode"), "opencode");
  assert.throws(() => parseProposalRuntime("unknown"), /unknown Forme runtime/);
});
