import { CodexAppServerConnection, inspectCodex } from "./codex.ts";
import { inspectOpenCode, OpenCodeServerConnection } from "./opencode.ts";
import { safeError } from "./process.ts";

const allowNpxFallback = !process.argv.includes("--no-npx");
let failed = false;

const codex = inspectCodex();
let codexProtocol = false;
if (codex.installed) {
  try {
    const connection = await CodexAppServerConnection.connect();
    codexProtocol = true;
    await connection.close();
  } catch (error) {
    failed = true;
    codex.health = "unavailable";
    codex.detail = safeError(error);
  }
} else {
  failed = true;
}

const opencode = inspectOpenCode({ allowNpxFallback });
let opencodeServer = false;
let opencodeOpenApiPaths = 0;
if (opencode.installed) {
  try {
    const connection = await OpenCodeServerConnection.connect({
      allowNpxFallback,
      isolateState: true,
    });
    opencodeServer = true;
    opencodeOpenApiPaths = connection.openApiPathCount;
    opencode.version = connection.descriptor.version;
    await connection.close();
  } catch (error) {
    failed = true;
    opencode.health = "unavailable";
    opencode.detail = safeError(error);
  }
} else {
  failed = true;
}

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  codex: { ...codex, protocolInitialized: codexProtocol },
  opencode: { ...opencode, serverHealthy: opencodeServer, openApiPaths: opencodeOpenApiPaths },
}, null, 2));

if (failed) process.exitCode = 1;
