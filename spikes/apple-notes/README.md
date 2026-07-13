# Apple Notes export spike

Research-only code for issue #30. It does not alter Notes or integrate with the
white-glove installer.

```sh
npm install --prefix spikes/apple-notes
mkdir /tmp/forme-apple-notes-export
osascript -l JavaScript spikes/apple-notes/export.jxa /tmp/forme-apple-notes-export
node spikes/apple-notes/convert.mjs /tmp/forme-apple-notes-export
node spikes/apple-notes/audit.mjs /tmp/forme-apple-notes-export
```

The export directory contains private note content. Keep it outside the repo,
do not include it in logs or issue comments, and delete it after the fidelity
audit. `manifest.json` also contains note titles and must be treated as private.

The exporter asks macOS for permission to automate Notes on first use. It reads
the public Notes scripting interface, writes a separate mirror, and records
locked or failed items instead of bypassing them.

Measured results from the 2026-07-12 machine spike are in
`RESULTS-2026-07-12.md`.
