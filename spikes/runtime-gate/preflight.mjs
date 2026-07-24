import { randomBytes } from "node:crypto"
import { spawn, spawnSync } from "node:child_process"
import { mkdtemp, mkdir, rm } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import readline from "node:readline"

const timeoutMs = positiveInteger(process.env.FORME_PREFLIGHT_TIMEOUT_MS, 15_000)
const codexBin = process.env.CODEX_BIN || "codex"
const pinnedOpenCodeVersion = process.env.OPENCODE_VERSION || "1.18.1"

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value || "", 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function commandExists(command) {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf8",
    timeout: timeoutMs,
  })
  return !result.error && result.status === 0
}

function openCodeCommand() {
  if (process.env.OPENCODE_BIN) {
    return { command: process.env.OPENCODE_BIN, prefix: [], source: "configured" }
  }
  if (commandExists("opencode")) {
    return { command: "opencode", prefix: [], source: "installed" }
  }
  return {
    command: "npx",
    prefix: ["--yes", `opencode-ai@${pinnedOpenCodeVersion}`],
    source: "pinned-npx-fallback",
  }
}

async function capture(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill("SIGTERM")
      reject(new Error(`${command} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    child.stdout.on("data", (chunk) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk
    })
    child.on("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on("exit", (code, signal) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() })
        return
      }
      reject(new Error(`${command} exited with ${code ?? signal}: ${stderr.trim()}`))
    })
  })
}

async function codexPreflight() {
  const version = (await capture(codexBin, ["--version"])).stdout

  const initialized = await new Promise((resolve, reject) => {
    const child = spawn(codexBin, ["app-server", "--stdio"], {
      stdio: ["pipe", "pipe", "pipe"],
    })
    const lines = readline.createInterface({ input: child.stdout })
    let stderr = ""
    let settled = false
    const finish = (callback, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      lines.close()
      child.kill("SIGTERM")
      callback(value)
    }
    const timer = setTimeout(() => {
      finish(reject, new Error(`Codex App Server initialize timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    child.stderr.on("data", (chunk) => {
      stderr += chunk
    })
    child.on("error", (error) => finish(reject, error))
    child.on("exit", (code, signal) => {
      if (!settled && code !== 0 && signal !== "SIGTERM") {
        finish(reject, new Error(`Codex App Server exited early: ${stderr.trim()}`))
      }
    })
    lines.on("line", (line) => {
      let message
      try {
        message = JSON.parse(line)
      } catch {
        return
      }
      if (message.id !== 1) return
      if (message.error) {
        finish(reject, new Error(`Codex initialize failed: ${JSON.stringify(message.error)}`))
        return
      }
      child.stdin.write(`${JSON.stringify({ method: "initialized", params: {} })}\n`)
      const result = message.result || {}
      finish(resolve, {
        initialized: true,
        userAgent: result.userAgent || null,
        platformFamily: result.platformFamily || null,
        platformOs: result.platformOs || null,
        codexHomePresent: typeof result.codexHome === "string" && result.codexHome.length > 0,
      })
    })

    child.stdin.write(`${JSON.stringify({
      method: "initialize",
      id: 1,
      params: {
        clientInfo: {
          name: "forme_runtime_gate",
          title: "Forme Runtime Gate",
          version: "0.0.0",
        },
      },
    })}\n`)
  })

  return { version, ...initialized }
}

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      const port = typeof address === "object" && address ? address.port : null
      server.close((error) => {
        if (error) reject(error)
        else if (port) resolve(port)
        else reject(new Error("Could not reserve an OpenCode preflight port"))
      })
    })
  })
}

async function waitForJson(url, authorization, child) {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error("OpenCode server exited before becoming healthy")
    }
    try {
      const response = await fetch(url, {
        headers: { authorization },
        signal: AbortSignal.timeout(Math.min(1_000, timeoutMs)),
      })
      if (response.ok) return response.json()
      lastError = new Error(`OpenCode health returned HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw lastError || new Error("OpenCode health timed out")
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
    }, 2_000)
    child.once("exit", () => {
      clearTimeout(timer)
      resolve()
    })
    child.kill("SIGTERM")
  })
}

async function openCodePreflight() {
  const command = openCodeCommand()
  const version = (await capture(command.command, [...command.prefix, "--version"])).stdout
  const root = await mkdtemp(join(tmpdir(), "forme-opencode-preflight-"))
  const xdg = {
    config: join(root, "config"),
    data: join(root, "data"),
    cache: join(root, "cache"),
  }
  await Promise.all(Object.values(xdg).map((path) => mkdir(path, { recursive: true })))

  const port = await reservePort()
  const username = "forme-preflight"
  const password = randomBytes(24).toString("base64url")
  const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
  const child = spawn(command.command, [
    ...command.prefix,
    "serve",
    "--pure",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
    "--print-logs",
  ], {
    cwd: root,
    env: {
      ...process.env,
      XDG_CONFIG_HOME: xdg.config,
      XDG_DATA_HOME: xdg.data,
      XDG_CACHE_HOME: xdg.cache,
      OPENCODE_SERVER_USERNAME: username,
      OPENCODE_SERVER_PASSWORD: password,
    },
    stdio: ["ignore", "pipe", "pipe"],
  })

  let stderr = ""
  child.stderr.on("data", (chunk) => {
    stderr += chunk
  })

  try {
    const base = `http://127.0.0.1:${port}`
    const health = await waitForJson(`${base}/global/health`, authorization, child)
    const response = await fetch(`${base}/doc`, {
      headers: { authorization },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) throw new Error(`OpenCode /doc returned HTTP ${response.status}`)
    const document = await response.json()
    return {
      version,
      commandSource: command.source,
      healthy: health.healthy === true,
      serverVersion: health.version || null,
      authenticatedLoopback: true,
      pureMode: true,
      openapi: document.openapi || null,
      apiPathCount: Object.keys(document.paths || {}).length,
    }
  } catch (error) {
    const detail = stderr.trim()
    throw new Error(`${error.message}${detail ? `; server stderr: ${detail}` : ""}`)
  } finally {
    await stopChild(child)
    await rm(root, { recursive: true, force: true })
  }
}

const startedAt = Date.now()
try {
  const [codex, opencode] = await Promise.all([
    codexPreflight(),
    openCodePreflight(),
  ])
  console.log(JSON.stringify({
    ok: true,
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    node: process.version,
    codex,
    opencode,
    notChecked: [
      "model-provider authentication",
      "prompt execution",
      "structured proposal validation",
      "permission enforcement",
      "OS containment",
      "crash equivalence",
    ],
  }, null, 2))
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2))
  process.exitCode = 1
}
