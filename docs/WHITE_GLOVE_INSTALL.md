# Forme white-glove install — clone to first card in 30 minutes

This is the operator runbook for the first non-owner Macs (#28). It is not a public self-serve installer yet. Keep one person on the call, run the stopwatch, and write down every pause or explanation the user needs.

## Before the call (5 minutes, not on the user's clock)

- macOS user account can open Terminal and approve a device login.
- The vault is a git repository with at least one commit and tracked Markdown files. Folder names do not matter.
- Node.js is at least 22.18, Codex CLI is installed, and this repo can be cloned.
- Ask one question before touching the machine: **ChatGPT subscription login or OpenAI API key?** Do not improvise a third auth path.
- Read [PRIVACY.md](./PRIVACY.md) aloud enough that the user understands the model-provider boundary and what accept will write.

## 0:00–0:05 — clone and preflight

```sh
git clone git@github.com:formehq/forme.git
cd forme
FORME_VAULT="/absolute/path/to/their/vault" launchd/install.sh --preflight --auth skip
```

Preflight writes nothing. Before login, `--auth skip` checks macOS, Node, Codex presence, git history, tracked Markdown, and schedule values. The final install below always checks the selected auth path and makes a real model call.

## 0:05–0:10 — authenticate Codex

### ChatGPT subscription

```sh
codex login --device-auth
codex login status
```

Continue only when the status says `Logged in using ChatGPT`.

### API key

Read the key without putting it in shell history, then export it for this installer process:

```sh
read -s OPENAI_API_KEY
export OPENAI_API_KEY
```

Keep that terminal open for the install command below. The installer pipes the key to `codex login --with-api-key`, unsets it before any Forme child process, and never writes it to a plist or Forme log. Codex owns its credential storage.

## 0:10–0:25 — install and first scan

For ChatGPT auth:

```sh
FORME_AUTH=chatgpt FORME_VAULT="/absolute/path/to/their/vault" launchd/install.sh
```

For API-key auth:

```sh
FORME_AUTH=api-key FORME_VAULT="/absolute/path/to/their/vault" launchd/install.sh
unset OPENAI_API_KEY
```

One command does the following:

1. Installs pinned npm dependencies when missing.
2. Creates only `<vault>/98_Forme/cards/`; no knowledge-layer file is changed.
3. Makes one tiny, ephemeral, read-only Codex call and requires `FORME_READY`.
4. Runs a conservative first scan over the latest 12 commits and at most 24 Markdown files. Cold start is machine-capped at **two cards** and does not inject Taste Rules or slow-layer context.
5. Auto-detects the slow layer: `02_Wiki/` when present, otherwise the vault root. Future scans exclude `98_Forme/`.
6. Renders and validates three plists, loads the runner/State Diff/console jobs, waits up to 10 seconds for console health, then opens it.

No reliable drift can legitimately produce zero cards. Do not manufacture a card to pass the stopwatch; record `zero true drift` and inspect the chosen git window.

## 0:25–0:30 — verify with the user

- Console opens at `http://127.0.0.1:6180` and shows either the first card or an honest empty state.
- Every newly generated card face and console control is English-first. Evidence quotes and diff source text remain verbatim in the vault's language.
- The card cites a real vault path and exact evidence. Expand the diff together.
- The user can explain accept/park/reject without operator translation.
- `~/Library/Logs/forme/` contains no crash loop; `launchctl print gui/$(id -u)/com.forme.console` succeeds.
- Note stopwatch times: clone, auth ready, first scan start/end, console healthy, first card visible.

## Zayn rehearsal — clean account or spare Mac

Run this before the 07-21 install window:

1. Use a macOS account with no Forme plists, no `98_Forme/`, and no Codex login. Do not reuse the owner launch agents.
2. Use a git-backed disposable copy of a real vault. Keep its native folder structure; do not add `02_Wiki`, `00_Inbox`, or owner naming conventions.
3. Start the timer before clone. Run the ChatGPT path once.
4. Repeat with the API-key path on a credential you are allowed to use. Confirm `codex login status` reports API key and search all generated plists/logs for the key before deleting the test account.
5. Capture every prompt, macOS permission dialog, unexplained pause, and manual command. Anything beyond the commands above is an install-package bug.
6. End with `launchd/uninstall.sh`; verify jobs/plists are gone and the disposable vault's `98_Forme/` remains for audit.

## Fast failure map

| Symptom | Check |
| --- | --- |
| `Node.js ... too old` | Install Node >=22.18 and rerun preflight. |
| `Codex auth not ready` | Choose the declared ChatGPT or API-key path; rerun `codex login status`. |
| No cards | Inspect first-run output; confirm recent commits touched tracked Markdown. Zero true drift is allowed. |
| Console not healthy in 10s | Read `~/Library/Logs/forme/console.log`; validate port 6180 is free. |
| launchd job exits | The rendered plist has absolute Node/repo/vault paths; run `/usr/bin/plutil -lint ~/Library/LaunchAgents/com.forme.*.plist`. |

Update install:

```sh
git pull
FORME_VAULT="/absolute/path/to/their/vault" launchd/install.sh
```

Uninstall:

```sh
launchd/uninstall.sh
```

Uninstall stops jobs and removes plists. It intentionally leaves `98_Forme/`, accepted git commits, and logs unless `--purge-logs` is passed.
