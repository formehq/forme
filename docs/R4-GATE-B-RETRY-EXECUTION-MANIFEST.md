# R4 Gate B Retry Execution Manifest — Do Not Approve

- Status: **PROPOSED / EXECUTION NOT RECOMMENDED**
- Parent Construction Packet:
  `sha256:4122e293fb476dc90e289566745459d9fe1b9603c3473c49de9d2e1429e025e7`
- Approved R4 Technical Control Packet:
  `sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5`
- Retry Execution Grant: **NOT REQUESTED**
- First Provider-Call Test Grant: **NOT REQUESTED**
- Provider sessions / bytes / spend authorized: **0 / 0 / US$0**
- Real Guest bytes / external messages / production writes / deploys / merges:
  **0 / 0 / 0 / 0 / 0**

This Manifest deliberately binds a **non-approvable** execution proposal. It
records the reviewed command surface and exact resources, but its current
runner returns controlled Yellow for three unresolved physical adapters. A new
hash-pinned correction manifest is required before a Retry Execution Grant.

## 1. Frozen construction basis

| Binding | Exact value |
|---|---|
| Code checkpoint | `68e6515322e9d7c278c5bf08db0ea2b9b1df32eb` |
| Code-checkpoint tree | `3e5136e7cf005f95a4ef4343277d8d3c1ec7b050` |
| Execution-bearing file count | `50` |
| Execution-bearing aggregate | `sha256:50e043df23f338e9798baa600d1cb78e245b925f5efd5958750e437a53f2f5c4` |
| Immutable file count | `17` |
| Immutable aggregate | `sha256:94aa16f926fc13c1f5150e3deb8665d42738b25fd4be5f9dc99b77042e3c6cfc` |
| `package-lock.json` | `sha256:d7a56f2e40ffc80f03413c8e697e1a9a9199dcb8873cedc43cd421a2b265c812` |

This file intentionally does not contain its own SHA-256. The Owner gate pins
that external hash. The containing documentation commit is likewise returned
after commit because a Git object cannot contain its own object ID.

## 2. Command surface

Construction-only reviewed command:

```text
node scripts/r4-gate-b-runner.mjs dry-run
```

Separate cleanup command shape, usable only for one marker-bound run after a
future exact grant:

```text
node scripts/r4-gate-b-cleanup.mjs cleanup --run-id ${RUN_ID} --manifest-sha ${THIS_MANIFEST_SHA256} --no-docker-fallback
```

The runner recognizes this future execution shape:

```text
npm run r4:gate-b -- --packet-sha sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5 --manifest-sha ${THIS_MANIFEST_SHA256} --execution-grant ${THIS_MANIFEST_SHA256} --codex-install-root ${ONE_EXACT_OPENAI_CODEX_0_145_0_PACKAGE_ROOT}
```

It rejects provider, model, credential, real-data, arbitrary executable, cwd,
environment, command and search-root arguments. The one installation root is
not searched: only `bin/codex.js` and
`vendor/aarch64-apple-darwin/codex/codex` may be opened, and both exact hashes
must match before staging.

**No value may be substituted into the execution shape under this Manifest,
because Retry Execution is not recommended or requested.** The syntax is frozen
for review, not an authorization to run it.

## 3. Exact serial lane order

```text
preflight
→ gate-a-regression-and-protocol
→ api-and-local-format-contracts
→ postgres-migration-roles-races
→ encrypted-field-adapter
→ fake-budget-and-event-fence
→ codex-zero-call
→ macos-physical-boundary
→ cleanup-and-artifact-index
```

Red makes every later non-cleanup lane `NOT_RUN`. Cleanup always runs. Yellow
may continue only independent local lanes. Codex or macOS Yellow disables the
AI lane and preserves manual-owner-only availability.

## 4. Exact resource bindings

### PostgreSQL

- Image: `postgres:16.10-bookworm`
- OCI index:
  `sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74`
- Linux arm64 manifest:
  `sha256:a64c3894964de33920f4de7cc1e88dfdfa3284bcb0c7c760a0512680a34a8faf`
- Container: `forme-r4-gb-e417836bd67b-pg`
- Volume: `forme-r4-gb-e417836bd67b-pgdata`
- Database: `forme_r4_gate_b`
- Network: `none`; host ports: none
- Current blocker: migration/verify/rollback SQL is constructed, but the
  aggregate runner has no reviewed physical eight-race adapter and therefore
  returns `POSTGRES_PHYSICAL_EXECUTION_REQUIRES_REVIEWED_ADAPTER`.

### Codex

- Distribution: official `@openai/codex@0.145.0`
- Launcher:
  `sha256:134063e133f0b4244fa3b251acf973d4fe4b4aeeacbdc135211bf480f59f1477`
- Darwin arm64 native binary:
  `sha256:1da3f4e0e96028b8a771814293c3033dafd1971f943f6c7e79b0897fe705f590`
- Stable schema: 273 files; aggregate
  `sha256:313baf8277ad3b5a3efdbfe1388762f0f41305ef0ea60c3e170c6bc28ec00a62`
- Allowed wire: `initialize` and `initialized` only; thread / turn / provider:
  `0 / 0 / 0`
- Child profile:
  `sha256:5f801ddabe277fb29608dff91d4c3c2ded1639a2ee363fd9d7bc866757e263ab`
- Current blocker: fake-executable construction is Green, but the real staged
  app-server handshake has not been composed with the reviewed Seatbelt outer
  wrapper. The runner therefore returns
  `CODEX_PHYSICAL_EXECUTION_REQUIRES_REVIEWED_SEATBELT_ADAPTER`.

### macOS

- Xcode `26.6` build `17F113`; Swift `6.3.3`
- App identifier: `org.chaostudio.forme.gate-b.local`
- Minimum system: macOS `26.0`
- Entitlements: empty; network entitlements: none
- Candidate key: Secure Enclave EC P-256, private-key usage + user presence;
  no login/Data Protection Keychain fallback
- Review authority: one-shot; maximum 15 minutes
- Current blocker: source and unit tests compile, but signing, custom temporary
  Keychain, Secure Enclave, review window and cleanup have not been composed in
  the aggregate runner. It therefore returns
  `MACOS_PHYSICAL_EXECUTION_REQUIRES_REVIEWED_SIGNING_ADAPTER`.

## 5. Physical boundary limitation

The child Seatbelt profile does not constrain the controlling desktop Agent.
On the current host that Agent retains broad filesystem authority, so the
boundary is partly procedural: invoke only the reviewed runner and perform no
ad-hoc investigation. Kernel-enforced control of the Agent itself requires a
restricted workspace, container, VM, or host filesystem permission profile.

## 6. Execution-bearing hash index

The following 50 path/hash pairs are canonical. Paths are repository-relative.

```text
sha256:d7722c090d5ec8d7d28a8f269610a42d7ad1d9eb09b2f090dfd739bfac8d4e36  fixtures/r4-gate-b/codex-app-server-0.145.0-methods.json
sha256:0cf2d60b9fac52b9339b1529404c8afdb01c892929c258fa20c5d1b1b04e96bf  fixtures/r4-gate-b/codex-app-server-0.145.0-schema.sha256
sha256:57169aedae8d67190d4e087b8ebe65033490acab41adfb1bea28fe652b335503  native/macos/Package.swift
sha256:97704a8960b4facceef54397a08fb5d0a456247c3627359215aa2a27df22656c  native/macos/Resources/FormeLocal.entitlements
sha256:4d943fe6e1cb55abbe547de1f1654bcef829705e6dd5ed3448f473cf19994b92  native/macos/Resources/Info.plist
sha256:3f0102f7def8d4a6859e6217c09997ae7ddbe0315cc55930309c75f5256f5f35  native/macos/Sources/FormeLocal/CodexAdapter.swift
sha256:52fdbb8a5111c898b693d158436e0254a8fbfb4aea086eac786f86bf1fe2e950  native/macos/Sources/FormeLocal/GateBProbe.swift
sha256:3d2e12a008c91217a200a42517a1096277e8c31db44497854e56046d58b68e73  native/macos/Sources/FormeLocal/KeychainProtector.swift
sha256:e0219082ffe309c591d3ab9c2b0365acfcf10c45da8d07e4101202ea6ad4046c  native/macos/Sources/FormeLocal/Launcher.swift
sha256:b19350e8513e8a5b1a27e59526158d49315c08ec679a4f60e993e45d7a908af3  native/macos/Sources/FormeLocal/MemoryPipe.swift
sha256:cd8b9fac6b79896fac1c150f9ec06de7d13a6578194c1661c438751cbd611fab  native/macos/Sources/FormeLocal/ResourceLimits.swift
sha256:a2354b30435357bef8a4e2944bacd2a2941b6c39194127e936d58d73c720a379  native/macos/Sources/FormeLocal/ReviewWindow.swift
sha256:a353b30eea419e5f90385c62c79716032504f79fddf2ce5a5a8ad1d11fcb22af  native/macos/Sources/FormeLocal/SandboxProfile.swift
sha256:f5678f7790c6ab303ff55fadad1727b3e03165d7cc7b109c204bab5793052fad  native/macos/Tests/FormeLocalTests/BoundaryTests.swift
sha256:24b9c2c79107e64d23b953ad44a23a42dcf4ba92a04bc6d3e8917b841582c90d  package.json
sha256:8fd286f7398a63d3e073d4b165fdaa6086045ecdb3939028a6169c2ea2afbdf4  packages/r4-codex-adapter/src/app-server-probe.ts
sha256:282a19a078b52bf8506b6cf6b7dca35fcb1a1d0b25aceffde78c930d66673ac6  packages/r4-codex-adapter/src/event-fence.ts
sha256:d7061b90fe3dcd565314e96a560a753d9c2e8cf0392de9bb66d822ab64057b7e  packages/r4-codex-adapter/src/fake-transport.ts
sha256:d35a3179198bb90c8ea1c5cab3500e109fbfff09c657f60f3fed506056cdcb1c  packages/r4-codex-adapter/src/index.ts
sha256:b33abb82a06f933f1bd30dec855f14969e4b9efc326a65233b04aac87b3a0e7d  packages/r4-persistence/src/encrypted-field.ts
sha256:f9b3a31fca1ffbdc7dff3f37924a321d90ac7aafc5a2b1188ec6a0671a3a62d6  packages/r4-persistence/src/index.ts
sha256:021cff86b2fc0cabebc63d85ca14f1fad41f7978b205594f90328872c5e7d3bf  schemas/r4/api-v1-index.json
sha256:8541775a52ab541db08526b743621e817c920a7ac3b30ad416df65e073d3d0c1  schemas/r4/api-v1.schema.json
sha256:3513c9d6e597868e6eb499b2cfdae90c22fc786457f024ef36a34c580cf2e81b  schemas/r4/gate-b-evidence.schema.json
sha256:ae8821c359de868ae9e8b51414db334c73fbdb7b8b59aa25b89c912f9681dbcd  schemas/r4/local-formats-index.json
sha256:e1d35cec21e321273214ca232d5975cade1133f27b96098815185d091f16b088  schemas/r4/local-formats.schema.json
sha256:bdf76cf9d5e5dfb4f357d8d2fe230071cbbe344fbb599abca093005c915c0a71  schemas/r4/sql/0000_r4_gate_b_bootstrap.sql
sha256:94104673383c07365f352d68cc36f55a8eaf9b9c756f02c90ffeb7c8eae2f6dc  schemas/r4/sql/0001_r4_presence.rollback.sql
sha256:294fabfaabf7ed04d2c711ea8d1185f475ccd288d8db078ecc3fb0813e3ee4b3  schemas/r4/sql/0001_r4_presence.sql
sha256:beacf7fbd65745a9d2591482c602307e81c5c778cb0d896c1dc2501f0e19211d  schemas/r4/sql/0001_r4_presence.verify.sql
sha256:358b17e0ee024300b0540806f9a6a4a44ef9d47271c98d81641a8274bf1afcaa  scripts/r4-doc-audit.mjs
sha256:d95d52e95cb26250a2c36dbfacbfee9b20cd449b5f8cd42a668308485c7b0447  scripts/r4-gate-b-api-contract.mjs
sha256:bd08acfa059fa95ce98007cd000fe85ab102f621970756c4fcb837a299404581  scripts/r4-gate-b-cleanup.mjs
sha256:4870a3d4adcf944e6df8d786ea852ef5afbd9f991ec0db044d1148467b3ec657  scripts/r4-gate-b-codex-probe.mjs
sha256:8ff56dfc73f17b49373cf908e50b4c6d40baa553a660fd6ca66f1a5901058111  scripts/r4-gate-b-encrypted-field.mjs
sha256:39b576000c6d38b8741bbdd6a12ab73c787b9c8dd2d880757b738342d31fa902  scripts/r4-gate-b-fake-budget.mjs
sha256:0c5b2fd1d950c1ea6cb8bf40a6d94fd425953987fb4fb0efb1eaa1824b6f7f5e  scripts/r4-gate-b-macos-probe.sh
sha256:c4e31663cdee762705f35ff47541a09ebf9c7a9aaade36d61751c17e190bbc99  scripts/r4-gate-b-path-fence.mjs
sha256:4fde21a2a63d57af1011cd885002260c338bf6970794fe47a287ccc688891422  scripts/r4-gate-b-postgres.mjs
sha256:afa1c4546750bfbe23d83cc280df65f2f6135cb30f056f242abffed590229a0d  scripts/r4-gate-b-preflight.mjs
sha256:fbdc73c7d59adb4eb10e8a939060ce9066b4ede16f7382351afe65a401201cd1  scripts/r4-gate-b-runner.mjs
sha256:289276290fc59f663a4bb103bbaba3fc37917ea8ee362ed679ce372fd686dcbe  test/r4-gate-b/api-contract.test.ts
sha256:02be41f09727a883f734f7cf1278ee90e9e43a5b84ceeaf758cf2bf3ba63e6a7  test/r4-gate-b/codex-adapter.test.ts
sha256:9982af051908e118c698a46b0466345960ad42919eca084422d7723edf4e311e  test/r4-gate-b/encrypted-field.test.ts
sha256:36a59d19853048a88d4370c62f8b233d73fccf8b9db5cda1cc3c2af43e6c89fe  test/r4-gate-b/event-fence.test.ts
sha256:c82153bde9364eccd91485e94ac78890b5c6c902da5e9d46e5b63e856f1a74e2  test/r4-gate-b/fake-transport-budget.test.ts
sha256:441014892b5c89492b9109d462327ff1888259a412372c7b7458eda6fc2d4314  test/r4-gate-b/local-formats.test.ts
sha256:d99a89e531258a28a811af3ac1f89517f48589586bc6df01f608ffda04d76c87  test/r4-gate-b/macos-boundary.test.ts
sha256:5cd60eb3ea35728954e5b69b292b10c723d433c87700deb1afc3af61fb7ea558  test/r4-gate-b/path-fence.test.ts
sha256:355026d53fb9435438aa41cd4d768464a4a41af86d6f5a785269ceb5d40a4735  test/r4-gate-b/postgres-schema.test.ts
```

## 7. Classification and stop rule

- Construction result: **YELLOW**
- Retry Execution recommendation: **DO NOT APPROVE**
- Required next artifact: a new correction packet/manifest that implements and
  fixture-tests the three physical adapters without widening authority
- Provider call, Gate C, deploy, public traffic and merge remain prohibited

Approval of this file's hash would not turn its Yellow adapters into proof.
The correct next action is correction, not execution.
