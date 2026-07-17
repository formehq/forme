import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { renderPlist, xmlEscape } from "./render-plist.ts";

const here = dirname(fileURLToPath(import.meta.url));
const installScript = join(here, "install.sh");
const prepareScript = join(here, "prepare-codex.sh");
const uninstallScript = join(here, "uninstall.sh");

function vaultFixture(name: string): string {
  const vault = join(mkdtempSync(join(tmpdir(), "forme-install-")), name);
  mkdirSync(vault, { recursive: true });
  const git = (...args: string[]) => execFileSync("git", ["-C", vault, ...args]);
  git("init", "-q");
  git("config", "user.email", "install@test");
  git("config", "user.name", "Install Test");
  writeFileSync(join(vault, "Notes.md"), "# Notes\n\nA clean English vault.\n");
  git("add", "-A");
  git("commit", "-qm", "seed");
  return vault;
}

function baseEnv(home: string): NodeJS.ProcessEnv {
  const fakeBin = join(home, "bin");
  const fakeCodex = join(fakeBin, "codex");
  mkdirSync(fakeBin, { recursive: true });
  if (!existsSync(fakeCodex)) {
    writeFileSync(fakeCodex, [
      "#!/bin/sh",
      'if [ "$1" = "--version" ]; then echo "codex-cli test"; exit 0; fi',
      'if [ "$1" = "doctor" ] && [ "$2" = "--json" ]; then printf \'{"codexVersion":"0.144.3","checks":{"updates.status":{"details":{"latest version":"0.144.3"}}}}\\n\'; exit 0; fi',
      'if [ "$1" = "login" ] && [ "$2" = "status" ]; then echo "Logged in using ChatGPT"; exit 0; fi',
      "exit 0",
      "",
    ].join("\n"));
    chmodSync(fakeCodex, 0o755);
  }
  return {
    ...process.env,
    HOME: home,
    PATH: `${fakeBin}:${dirname(process.execPath)}:/usr/bin:/bin`,
    FORME_INSTALL_DIR: join(home, "LaunchAgents"),
    FORME_LOG_DIR: join(home, "Logs"),
    FORME_NO_LAUNCH: "1",
    FORME_SKIP_NPM: "1",
    FORME_SKIP_FIRST_RUN: "1",
    FORME_SKIP_CODEX_SMOKE: "1",
    FORME_NO_OPEN: "1",
    FORME_SKIP_CODEX_VERSION_CHECK: "1",
  };
}

test("plist renderer XML-escapes paths and rejects missing tokens", () => {
  assert.equal(xmlEscape('/tmp/A & B/"vault"'), "/tmp/A &amp; B/&quot;vault&quot;");
  assert.equal(renderPlist("<string>{{VAULT}}</string>", { VAULT: "/tmp/A & B" }), "<string>/tmp/A &amp; B</string>");
  assert.throws(() => renderPlist("{{VAULT}} {{PORT}}", { VAULT: "/tmp" }), /missing plist value/);
  const installer = readFileSync(installScript, "utf8");
  assert.match(installer, /--connect-timeout 1 --max-time 2/);
  assert.match(installer, /\*'"product":"forme"'\*/);
});

test("white-glove install renders valid generic plists and initializes only 98_Forme", () => {
  const home = mkdtempSync(join(tmpdir(), "forme-home-"));
  const vault = vaultFixture("Vault & Notes");
  const output = execFileSync("sh", [installScript, "--vault", vault, "--auth", "skip", "--no-launch", "--skip-smoke", "--skip-first-run", "--skip-npm", "--no-open"], {
    encoding: "utf8",
    env: baseEnv(home),
  });
  assert.match(output, /ready:/);
  assert.equal(existsSync(join(vault, "98_Forme", "cards")), true);
  for (const label of ["com.forme.runner", "com.forme.statediff", "com.forme.console"]) {
    const plist = join(home, "LaunchAgents", `${label}.plist`);
    const body = readFileSync(plist, "utf8");
    assert.doesNotMatch(body, /\{\{/);
    assert.match(body, /Vault &amp; Notes/);
    execFileSync("/usr/bin/plutil", ["-lint", plist]);
  }
  const runner = readFileSync(join(home, "LaunchAgents", "com.forme.runner.plist"), "utf8");
  assert.match(runner, /<string>--slow-root<\/string><string>\.<\/string>/);

  execFileSync("sh", [uninstallScript], { env: { ...baseEnv(home), FORME_NO_LAUNCH: "1" } });
  assert.equal(existsSync(join(home, "LaunchAgents", "com.forme.runner.plist")), false);
  assert.equal(existsSync(join(vault, "98_Forme")), true);
});

test("API key reaches login through stdin, is absent from smoke, and never enters plists", () => {
  const home = mkdtempSync(join(tmpdir(), "forme-api-home-"));
  const vault = vaultFixture("api-vault");
  const fakeBin = join(home, "bin");
  const captured = join(home, "captured-key");
  const smokeEnv = join(home, "smoke-env");
  const leakedEnv = join(home, "leaked-env");
  mkdirSync(fakeBin, { recursive: true });
  const fakeCodex = join(fakeBin, "codex");
  writeFileSync(
    fakeCodex,
    [
      "#!/bin/sh",
      'if [ -n "${OPENAI_API_KEY:-}" ]; then printf "%s\\n" "$*" >> "$FAKE_CODEX_LEAK"; fi',
      'if [ "$1" = "login" ] && [ "$2" = "--with-api-key" ]; then cat > "$FAKE_CODEX_STDIN"; exit 0; fi',
      'if [ "$1" = "login" ] && [ "$2" = "status" ]; then echo "Logged in using API key"; exit 0; fi',
      'if [ "$1" = "--version" ]; then echo "codex-cli test"; exit 0; fi',
      'if [ "$1" = "exec" ]; then',
      '  printf "%s" "${OPENAI_API_KEY:-}" > "$FAKE_CODEX_EXEC_ENV"',
      '  while [ "$#" -gt 0 ]; do if [ "$1" = "-o" ]; then printf "FORME_READY\\n" > "$2"; break; fi; shift; done',
      '  echo "fake codex noise" >&2',
      "  exit 0",
      "fi",
      "exit 0",
      "",
    ].join("\n"),
  );
  chmodSync(fakeCodex, 0o755);
  const secret = "sk-test-never-write-this";
  const env = {
    ...baseEnv(home),
    PATH: `${fakeBin}:${dirname(process.execPath)}:/usr/bin:/bin`,
    OPENAI_API_KEY: secret,
    FAKE_CODEX_STDIN: captured,
    FAKE_CODEX_EXEC_ENV: smokeEnv,
    FAKE_CODEX_LEAK: leakedEnv,
    FORME_SKIP_CODEX_SMOKE: "0",
  };
  const output = execFileSync("sh", [installScript, "--vault", vault, "--auth", "api-key", "--no-launch", "--skip-first-run", "--skip-npm", "--no-open"], {
    encoding: "utf8",
    env,
  });
  assert.equal(readFileSync(captured, "utf8"), secret);
  assert.equal(readFileSync(smokeEnv, "utf8"), "");
  assert.equal(existsSync(leakedEnv), false);
  assert.doesNotMatch(output, /fake codex noise/);
  for (const file of ["com.forme.runner.plist", "com.forme.statediff.plist", "com.forme.console.plist"]) {
    assert.doesNotMatch(readFileSync(join(home, "LaunchAgents", file), "utf8"), new RegExp(secret));
  }
});

test("pre-clock Codex preparation upgrades a stale CLI and verifies the result", () => {
  const home = mkdtempSync(join(tmpdir(), "forme-prepare-home-"));
  const fakeBin = join(home, "bin");
  const marker = join(home, "updated");
  mkdirSync(fakeBin, { recursive: true });
  const fakeCodex = join(fakeBin, "codex");
  writeFileSync(fakeCodex, [
    "#!/bin/sh",
    'if [ "$1" = "update" ] && [ "$2" = "--help" ]; then exit 0; fi',
    'if [ "$1" = "update" ]; then : > "$FAKE_UPDATE_MARKER"; exit 0; fi',
    'if [ "$1" = "--version" ]; then if [ -f "$FAKE_UPDATE_MARKER" ]; then echo "codex-cli 0.144.3"; else echo "codex-cli 0.142.5"; fi; exit 0; fi',
    'if [ "$1" = "doctor" ] && [ "$2" = "--json" ]; then',
    '  if [ -f "$FAKE_UPDATE_MARKER" ]; then CURRENT="0.144.3"; else CURRENT="0.142.5"; fi',
    '  printf \'{"codexVersion":"%s","checks":{"updates.status":{"details":{"latest version":"0.144.3"}}}}\\n\' "$CURRENT"',
    "  exit 0",
    "fi",
    'if [ "$1" = "login" ] && [ "$2" = "status" ]; then echo "Not logged in"; exit 1; fi',
    "exit 2",
    "",
  ].join("\n"));
  chmodSync(fakeCodex, 0o755);
  const env = {
    ...process.env,
    HOME: home,
    FORME_CODEX_BIN: fakeCodex,
    FORME_NODE_BIN: process.execPath,
    FAKE_UPDATE_MARKER: marker,
  };

  const stale = spawnSync("sh", [prepareScript, "--verify-only"], { encoding: "utf8", env });
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /Codex 0\.142\.5 is stale/);
  assert.equal(existsSync(marker), false);

  const updated = spawnSync("sh", [prepareScript], { encoding: "utf8", env });
  assert.equal(updated.status, 0, updated.stderr);
  assert.equal(existsSync(marker), true);
  assert.match(updated.stdout, /Codex 0\.144\.3 is current/);
  assert.match(updated.stdout, /Codex preparation passed/);
});

test("unsupported attachment count blocks install until the exact consent gate is explicit", () => {
  const home = mkdtempSync(join(tmpdir(), "forme-consent-home-"));
  const vault = vaultFixture("consent-vault");
  const env = baseEnv(home);
  const blocked = spawnSync("sh", [
    installScript,
    "--vault", vault,
    "--auth", "skip",
    "--preflight",
    "--unsupported-attachments", "4",
  ], { encoding: "utf8", env });
  assert.equal(blocked.status, 1);
  assert.match(blocked.stdout, /omits 4 unsupported attachment/);
  assert.match(blocked.stderr, /require informed consent/);

  const accepted = spawnSync("sh", [
    installScript,
    "--vault", vault,
    "--auth", "skip",
    "--preflight",
    "--unsupported-attachments", "4",
    "--accept-unsupported-attachments",
  ], { encoding: "utf8", env });
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.match(accepted.stdout, /confirmed informed consent for exactly 4/);
  assert.equal(existsSync(join(vault, "98_Forme")), false);
});

test("ChatGPT-plan usage limit fails clearly before runtime files or launch jobs", () => {
  const home = mkdtempSync(join(tmpdir(), "forme-limit-home-"));
  const vault = vaultFixture("limit-vault");
  const fakeBin = join(home, "bin");
  mkdirSync(fakeBin, { recursive: true });
  const fakeCodex = join(fakeBin, "codex");
  writeFileSync(fakeCodex, [
    "#!/bin/sh",
    'if [ "$1" = "doctor" ] && [ "$2" = "--json" ]; then printf \'{"codexVersion":"0.144.3","checks":{"updates.status":{"details":{"latest version":"0.144.3"}}}}\\n\'; exit 0; fi',
    'if [ "$1" = "login" ] && [ "$2" = "status" ]; then echo "Logged in using ChatGPT"; exit 0; fi',
    'if [ "$1" = "--version" ]; then echo "codex-cli 0.144.3"; exit 0; fi',
    'if [ "$1" = "exec" ]; then echo "You have reached your ChatGPT usage limit; reset at 09:00" >&2; exit 1; fi',
    "exit 2",
    "",
  ].join("\n"));
  chmodSync(fakeCodex, 0o755);
  const env = {
    ...baseEnv(home),
    PATH: `${fakeBin}:${dirname(process.execPath)}:/usr/bin:/bin`,
    FORME_SKIP_CODEX_VERSION_CHECK: "0",
    FORME_SKIP_CODEX_SMOKE: "0",
  };
  const result = spawnSync("sh", [
    installScript,
    "--vault", vault,
    "--auth", "chatgpt",
    "--no-launch",
    "--skip-first-run",
    "--skip-npm",
    "--no-open",
  ], { encoding: "utf8", env });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ChatGPT-plan usage limit reached during Codex smoke/);
  assert.match(result.stderr, /Wait for the plan reset/);
  assert.equal(existsSync(join(vault, "98_Forme")), false);
  assert.equal(existsSync(join(home, "LaunchAgents")), false);
});
