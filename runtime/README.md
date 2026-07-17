# Harness runtime boundary (M0)

Forme owns the product policy, proposal contract, validation, fingerprints, and every disk write. A harness runtime owns model execution, tool orchestration, and its native session protocol. The boundary exists so Codex and OpenCode can both be first-class without making either runtime's internal event or permission model the product's source of truth.

## Available proposal runtimes

| `--runtime` | Transport | Structured output | Isolation used by Forme | Status |
| --- | --- | --- | --- | --- |
| `codex-exec` | one-shot CLI | native output schema | Codex read-only OS sandbox | stable default |
| `codex-app-server` | JSONL RPC over stdio | `turn/start.outputSchema` | Codex read-only OS sandbox + approvals never | working opt-in |
| `opencode` | authenticated loopback HTTP | `format: json_schema` | OpenCode deny-by-default application permissions | working opt-in |

Select an adapter with `node runner/index.ts --vault <path> --runtime <name>`. `FORME_RUNTIME` provides the same setting. The existing default does not change during M0.

For OpenCode, a model override uses `provider/model` form. The adapter uses an installed `opencode` binary when available and otherwise a pinned `npx opencode-ai@1.18.1` fallback. The fallback is intentional and versioned; install packaging should replace it with a prepared binary before OpenCode becomes a default path.

## Security boundary

- Both proposal adapters receive Forme's existing loose agent-output schema; Forme then validates the result again with its own AJV contract before any write.
- Codex App Server starts an ephemeral thread with `sandbox: read-only` and `approvalPolicy: never`.
- OpenCode binds only to `127.0.0.1` on an ephemeral port with a random per-process Basic Auth secret. Its session permissions deny `*` and then allow only read/list/search tools. `OPENCODE_PURE=1` disables third-party plugins for this pass.
- OpenCode permissions are not described as an OS sandbox. If Forme later authorizes runtime writes, it needs an external isolation layer as well as the existing deterministic Forme write gate.
- Neither adapter is allowed to write proposal results directly. Runtime capability is separate from Forme authorization.

## Verification

`npm run runtime:preflight` performs no model turn. It initializes the installed Codex App Server, then starts an isolated OpenCode server and verifies its health and OpenAPI surface. By default the preflight may use the pinned OpenCode npx fallback; pass `-- --no-npx` to require a prepared binary.

`runtime/runtime.test.ts` uses local fake protocol peers, so the normal test suite is deterministic and does not require credentials or network access. A live Codex structured turn was also exercised when this boundary was introduced.

## M0 limits

- The main drift scan is runtime-selectable. Question reface, Taste Rules, State Diff, and white-glove authentication still invoke Codex directly and should move through this boundary incrementally.
- The OpenCode server currently lives for one Forme pass. Reusing a long-lived authenticated server and normalizing SSE events belong to the next runtime milestone.
- OpenCode's server and structured-output path are verified; a real provider/model turn still depends on the user's OpenCode authentication and model configuration.
