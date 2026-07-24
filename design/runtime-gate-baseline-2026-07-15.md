# Runtime Gate Baseline — 2026-07-15

- Status: Measured local preflight evidence
- Command: `node spikes/runtime-gate/preflight.mjs`
- Scope: process discovery and supported server boundary only

## Result

Both first-class runtime integration boundaries are reachable on the current development machine.

| Check | Result |
|---|---|
| Node.js | `v24.14.1` |
| Codex CLI | `0.144.3` installed |
| Codex App Server | stdio initialize handshake passed |
| Codex platform | macOS / Unix reported by App Server |
| OpenCode CLI | not globally installed |
| OpenCode pinned fallback | `opencode-ai@1.18.1` executed successfully through `npx` |
| OpenCode server | authenticated loopback health passed in `--pure` mode |
| OpenCode API | OpenAPI `3.1.0`, 162 paths in the generated document |
| Cleanup | both child processes stopped; isolated OpenCode temporary state removed |

The measured preflight completed in approximately two seconds after the npm package was available locally.

## Product implications

1. **Codex can enter adapter development immediately.** The installed binary supports App Server initialization and identifies the Forme runtime-gate client.
2. **OpenCode does not need to be globally installed for development.** A pinned npm-distributed binary can supply the server, but the product still needs an explicit installation/version-management decision before non-technical onboarding.
3. **OpenCode should never be spawned unsecured.** Even on loopback, Forme should generate an ephemeral Basic Auth credential and pass it directly to its client.
4. **`--pure` is the correct first contract-test mode.** External plugins are disabled so adapter behavior can be measured before adding plugin-based Forme tools.
5. **Runtime discovery and server reachability are not the risky parts.** The remaining gates are permission containment, structured proposals, cancellation, crash equivalence, provider authentication, and restart from Twin state.

## Deliberately not tested

- model-provider authentication or quota;
- a billable/model-backed prompt;
- session creation or persistence;
- structured proposal correctness;
- generic write denial;
- Codex sandbox enforcement;
- OpenCode application-permission enforcement;
- crash injection and idempotent recovery.

These tests may consume user credentials/quota or require the implementation branch. They should be performed through explicit M0 fixtures rather than an ad hoc research command.

## Reproduction and privacy

The preflight prints versions, protocol metadata, and aggregate API shape only. It does not print credentials, home paths, project contents, note titles, or runtime configuration contents.

OpenCode runs from an isolated temporary working/config/data/cache directory with a random credential; the directory is removed in `finally`. Codex is initialized against the user's existing installation but no thread or turn is created.
