# Forme privacy and rollback — one page

## What stays local

- Forme has no Forme-hosted account, database, telemetry endpoint, or sync service.
- Cards, Markdown mirrors, decision events, Taste Rules, metrics, and State Diffs live under the vault's `98_Forme/` directory.
- The console binds only to `127.0.0.1` and rejects non-local hosts. Local logs live under `~/Library/Logs/forme/`.
- Forme never stores an OpenAI API key in its repo, vault, plist, or logs. The API-key install path sends it through stdin to `codex login`; Codex owns credential storage.

## The model-provider boundary

Forme is local-first, not offline. During a scan, the user's own Codex CLI sends the selected Markdown context and Forme prompt to OpenAI under that user's ChatGPT or API-key credentials. Forme itself does not receive or retain a remote copy. Users should apply their OpenAI account/data-control policy to this model call and should not install Forme on material they are not permitted to send to the configured provider.

The agent runs with a read-only sandbox and returns schema-constrained JSON. It cannot write the vault. Forme's deterministic code validates the response and is the only layer that writes runtime artifacts.

## Source-mirror limits

An external-note exporter may be unable to represent every attachment. Forme
must not describe such a mirror as lossless. When source preparation reports a
nonzero unsupported-attachment count, the installer repeats that exact count
and blocks until the operator confirms that the user understood and accepted
the omission. Consent to a count does not authorize Forme to inspect, upload, or
silently discard any additional item.

## What accept changes

- Before a decision, Forme writes only inside `98_Forme/`.
- `accept` applies the displayed minimal replacement to one target file and creates a git commit containing only that file.
- A dirty target file, missing `before` text, ambiguous match, invalid schema, or path outside the vault stops the write.
- The four-second console undo uses `git revert`; history remains append-only. After that window, the normal git commit/revert workflow remains available.
- `park` and `reject` do not change knowledge-layer files.

## Uninstall and deletion

```sh
launchd/uninstall.sh
```

This stops all three launchd jobs and removes their plists. It deliberately keeps:

- `<vault>/98_Forme/` for audit and possible reinstall;
- accepted git commits and any later revert commits;
- local logs, unless `launchd/uninstall.sh --purge-logs` is used.

To delete Forme runtime history, the user may remove `98_Forme/` separately after deciding they no longer need its cards, decisions, or taste provenance. Uninstall never makes that irreversible choice automatically.
