# Runtime gate preflight

This read-only spike verifies that the local machine can reach the supported integration boundary of both first-class runtimes.

It does not create a model session, send a prompt, change a project file, or test authentication against a model provider.

```sh
node spikes/runtime-gate/preflight.mjs
```

Checks:

- installed Codex version;
- Codex App Server stdio initialization handshake;
- installed OpenCode version, or the pinned `opencode-ai` npm package fallback;
- authenticated loopback-only OpenCode server health;
- OpenCode OpenAPI version and path count;
- clean child-process shutdown.

The OpenCode server runs with `--pure`, a random Basic Auth credential, an isolated temporary XDG config/data/cache directory, and a temporary working directory. The temporary directory is removed after the check.

Environment overrides:

- `CODEX_BIN` — Codex executable, default `codex`.
- `OPENCODE_BIN` — OpenCode executable. If omitted and `opencode` is unavailable, the script uses `npx --yes opencode-ai@<pinned>`.
- `OPENCODE_VERSION` — pinned fallback version, default `1.18.1`.
- `FORME_PREFLIGHT_TIMEOUT_MS` — per-stage timeout, default `15000`.

This is M0 evidence only. A passing preflight does not prove runtime containment, provider authentication, structured proposal correctness, or crash equivalence.

