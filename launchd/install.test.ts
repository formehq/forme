import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { renderPlist, xmlEscape } from "./render-plist.ts";

const here = dirname(fileURLToPath(import.meta.url));
const installScript = join(here, "install.sh");
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
  return {
    ...process.env,
    HOME: home,
    FORME_INSTALL_DIR: join(home, "LaunchAgents"),
    FORME_LOG_DIR: join(home, "Logs"),
    FORME_NO_LAUNCH: "1",
    FORME_SKIP_NPM: "1",
    FORME_SKIP_FIRST_RUN: "1",
    FORME_SKIP_CODEX_SMOKE: "1",
    FORME_NO_OPEN: "1",
  };
}

test("plist renderer XML-escapes paths and rejects missing tokens", () => {
  assert.equal(xmlEscape('/tmp/A & B/"vault"'), "/tmp/A &amp; B/&quot;vault&quot;");
  assert.equal(renderPlist("<string>{{VAULT}}</string>", { VAULT: "/tmp/A & B" }), "<string>/tmp/A &amp; B</string>");
  assert.throws(() => renderPlist("{{VAULT}} {{PORT}}", { VAULT: "/tmp" }), /missing plist value/);
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
