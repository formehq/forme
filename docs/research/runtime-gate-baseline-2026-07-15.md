# Runtime gate baseline — 2026-07-15

- Status: historical local preflight evidence
- Original command: `node spikes/runtime-gate/preflight.mjs`
- Original artifact: [`harness-first/spikes/runtime-gate`](https://github.com/formehq/forme/tree/harness-first/spikes/runtime-gate)
- Scope: process discovery and supported server boundary only

This is a dated measurement, not a statement of current installed versions or
current upstream capability. Rerun an admitted probe before relying on it.

## Measured result

Both candidate runtime integration boundaries were reachable on the development
machine used for the original investigation.

| Check | 2026-07-15 result |
| --- | --- |
| Node.js | `v24.14.1` |
| Codex CLI | `0.144.3` installed |
| Codex App Server | stdio initialize handshake passed |
| Codex platform | macOS / Unix reported by App Server |
| OpenCode CLI | not globally installed |
| OpenCode pinned fallback | `opencode-ai@1.18.1` executed through `npx` |
| OpenCode server | authenticated loopback health passed in `--pure` mode |
| OpenCode API | OpenAPI `3.1.0`; 162 paths in the generated document |
| Cleanup | both child processes stopped; isolated OpenCode state removed |

The preflight completed in approximately two seconds after the npm package was
available locally.

## What this established

- Codex could enter adapter investigation through an installed, externally
  reachable boundary.
- OpenCode could be probed from a pinned npm-distributed binary without a
  global installation.
- Runtime discovery and server reachability were not the main unknowns.
- A loopback OpenCode server still required an explicit generated credential;
  loopback alone was not treated as authentication.
- Starting OpenCode without external plugins was a useful first measurement
  boundary before testing Forme-specific extension hooks.

## What it deliberately did not establish

- model-provider authentication, quota, or billable prompt behavior;
- session persistence;
- structured proposal correctness;
- generic write denial;
- Codex sandbox enforcement;
- OpenCode permission or OS containment;
- cancellation, crash recovery, and idempotency;
- restart from Twin state;
- production installation or non-technical onboarding.

Those capabilities require explicit adapter fixtures and the current owner
visibility/authority gate. A successful health probe is not a security or
product acceptance result.

## Privacy properties of the original probe

The preflight reported versions, protocol metadata, and aggregate API shape.
It did not intentionally print credentials, home paths, project contents, note
titles, or runtime configuration contents.

OpenCode used isolated temporary work/config/data/cache directories and a
random credential, then removed them during cleanup. Codex initialized against
the existing installation without creating a thread or turn.
