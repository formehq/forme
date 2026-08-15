# R4 #67 Integration Campaign Gate-B Concurrency Validation Correction Addendum

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Date: 2026-08-15
- Scope: repository-only correction of an existing Gate-B validation ambiguity,
  followed by completion of the already-approved inspect-missing evidence and
  status freeze
- Integration Campaign / Docker / cleanup / PostgreSQL / SQL:
  **NOT_AUTHORIZED_BY_THESE_BYTES**
- Production: **NOT_REQUESTED**
- Gate C: **NOT_REQUESTED**

## Decision in plain language

The approved Integration Campaign inspect-missing implementation commit `Kic`
is complete. Its focused parser tests, full local-PostgreSQL runner suite, full
R4 offline suite and repository spine are Green. No Docker socket, Docker CLI,
daemon, PostgreSQL, SQL, network or retained forensic root was touched.

The required default Gate-B Core regression command nevertheless failed twice
at `144 / 145`. Both failures were the same pre-existing synthetic macOS direct
feeder test and ended after the runner's fixed ten-second terminal wait with
`MACOS_FEEDER_TERMINAL_INVALID`. The same focused test is Green alone, and the
same complete `145`-test Gate-B Core set is Green when Node test-file
concurrency is set to one. That is validation ambiguity, not evidence that the
inspect-missing correction is wrong, and it may not be rewritten as Green.

The existing Gate-B runner starts one already-authorized synthetic feeder,
durably records its start and releases it, but then gives that feeder a fixed
`10_000` ms terminal window even though the surrounding construction exercise
has a bounded absolute authority deadline. Under concurrent repository test
load the child can miss the narrower wall-clock window. The runner then proves
the process group absent and reports a terminal error, exactly as its current
fail-closed contract requires.

This Addendum requests one medium-grained repository outcome: preserve the
completed `Kic` bytes; make the feeder terminal wait derive from the already
bounded absolute authority deadline instead of an unrelated fixed ten-second
window; prove the behavior without real helper, provider, network or physical
effects; then complete the original strict machine evidence and current-status
freeze. It does not waive the default concurrent Gate-B command and does not
authorize a replacement Integration Campaign.

## Immutable predecessor and validation truth

| Binding | Exact value |
|---|---|
| approved inspect-missing Addendum SHA / HEAD / tree | `sha256:a43fbb5ac8e795ab6b6bf51507d3489c9e803161419af50179d7f7e9bed97505` / `15536817efe6b0b7a5c8014e912f02429f197ef1` / `503c9432fd2b75fd16857afe58c2eb78a24581da` |
| approved inspect-missing Review SHA / HEAD / tree | `sha256:ed73deb10f3ec9dcd5501f6d25f40ec7b140838494521ddd4cc9574b95afe324` / `7e07672563201d92db14ecf3adcbf5f6ad970b9f` / `34b9fd454725c15710946503af7d8be126fa09ab` |
| completed `Kic` HEAD / tree / parent | `1e93280bc3842d40e6f797a38ca4bfa2a2277813` / `14526ed95feae2da6c9c14a89ece48616822e4e8` / `7e07672563201d92db14ecf3adcbf5f6ad970b9f` |
| `Kic` runner SHA / bytes | `sha256:f012fd876cc49bd14be3519af6aeef98d7451ab29c90c786a7f242f59915984c` / `735755` |
| `Kic` focused test SHA / bytes | `sha256:25e51e491a37e1e048e6bce590c8cf5d08599a4fa8b2fd02cf83a17523280b83` / `196175` |
| `Kic` two-path aggregate | `sha256:5dea77a0e5391f3283caab8a9b1d67f4a6ed8758be6be3631bad5283ca530f1f` |
| focused inspect/campaign tests | `15 / 15` Green |
| full local-PostgreSQL runner | `176 / 176` Green |
| full R4 offline | `748 / 748` Green |
| repository spine | `45 / 45` Green |
| default Gate-B Core, two runs | each `144 / 145`; same `MACOS_FEEDER_TERMINAL_INVALID` failure |
| focused failing test | `1 / 1` Green |
| serial full Gate-B Core | `145 / 145` Green |

`Kic` is accepted as immutable completed implementation truth. It is not
amended, squashed, rebased or called a completed construction. The missing
`Lic` and `Mic` commits were not created, and no partial evidence artifact is
retained in the worktree.

## Nine correction choices

Owner approval accepts these choices together:

1. **Do not waive concurrent Gate-B validation.** The exact default
   `npm run test:r4:gate-b-core` command must be Green. A focused or serial-only
   pass is diagnostic evidence, not a substitute.
2. **Preserve the absolute authority ceiling.** The feeder terminal wait may
   use only the remaining time inside the already-bound absolute authority
   deadline, plus the existing bounded cleanup grace. It may not create a new
   lifecycle, retry a feeder, extend the enclosing authority or turn a terminal
   mismatch into Green.
3. **Keep terminal truth fail closed.** Null terminal, spawn error, signal,
   nonzero exit, malformed control frame or unproven process-group absence
   remains non-Green and follows the existing exact cleanup/journal path.
4. **Correct the shared production path, not only the assertion.** The runner's
   common macOS feeder lifecycle must own the correction. Tests may not merely
   increase their own timeout, skip the case, force serial execution or weaken
   the expected result.
5. **Add deterministic load-bound coverage.** The focused test must exercise a
   delayed-but-within-authority terminal and an after-authority terminal through
   an injected synthetic clock/terminal seam. It may not sleep for the full
   production deadline or start a real macOS helper/provider.
6. **Prove both concurrency modes.** Validation must include the focused
   positive/negative matrix, at least two consecutive Green runs of the exact
   default concurrent Gate-B command, and one Green serial full run.
7. **Resume, do not restart, the inspect correction freeze.** After the Gate-B
   correction commit is frozen, create the original three evidence artifacts
   and the original report plus nine current-status updates. Evidence must bind
   both immutable `Kic` and the new Gate-B correction commit.
8. **Keep the physical history immutable.** Neither retained campaign root,
   the consumed V1 grant/evidence/journal nor any prior construction authority
   document may be read, rewritten, cleaned or reused.
9. **Keep every wider effect closed.** Docker/socket/daemon/OCI, cleanup,
   PostgreSQL/SQL, production/runtime/traffic, real Guest data, Provider/model,
   publication, deploy/release/spend and Gate C remain zero.

## Corrected topology and exact construction envelope

This Addendum is a direct child of committed `Kic`. Its direct-child Owner
Review must be separately and exactly approved. Approval then authorizes three
new direct, single-parent construction commits:

1. `Kgc`, modifying exactly:
   - `scripts/r4-gate-b-physical-runner.mjs`
   - `test/r4-gate-b-core/physical-runner.test.ts`
2. `Lic`, adding exactly:
   - `schemas/r4/public-core/local-postgres-integration-campaign-inspect-missing-correction-artifact-index.json`
   - `schemas/r4/public-core/local-postgres-integration-campaign-inspect-missing-correction-evidence.schema.json`
   - `docs/evidence/r4-public-core-local-postgres-integration-campaign-inspect-missing-correction.json`
3. `Mic`, adding the original correction report and modifying the original nine
   current-status surfaces:
   - `docs/R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-INSPECT-MISSING-CORRECTION-CONSTRUCTION-REPORT.md`
   - `README.md`
   - `docs/CONTROL.md`
   - `docs/DECISIONS.md`
   - `docs/NATIVE-HARNESS-ARCHITECTURE.md`
   - `docs/PRODUCT.md`
   - `docs/R4-PUBLIC-CORE-GATE-C-ACTIVATION-CARD.md`
   - `docs/README.md`
   - `docs/ROADMAP.md`
   - `docs/VALIDATION.md`

The corrected new construction workset is exactly **15 paths / 3 commits = 11
modified + 4 added**. `Kic` remains the immutable predecessor implementation
commit outside this new delta. The authority chain is exactly:

`Kic → Addendum → Review → Kgc → Lic → Mic`.

Any sixteenth construction path, mode change, merge commit, dependency change,
test-runner serialisation, historical-root access, physical call or authority
deadline expansion stops.

## Required validation and evidence chronology

The correction must prove, from committed bytes:

- exact predecessor Addendum/Review/`Kic` lineage, trees, two-path delta, per-file
  hashes and aggregate;
- exact new Addendum/Review and `Kgc` direct-child lineage, trees, exact two-path
  delta, per-file hashes and aggregate;
- a delayed terminal inside authority succeeds without retry and an expired,
  missing, malformed or ambiguous terminal remains fail closed;
- process start is still preceded by intent, release is still preceded by the
  durable started journal, and terminal/absence evidence is still ordered;
- the exact default Gate-B Core command is Green twice consecutively, its serial
  full form is Green, and no test is skipped or reclassified;
- every inspect-missing focused, full offline, spine, TypeScript, strict Ajv,
  docs, no-server-AI, inventory and diff check required by the predecessor
  Addendum remains Green;
- `Lic` records committed `Kic` and `Kgc` audit truth plus candidate-`Lic`
  truth only; committed-`Lic` audit is external and is not written back into
  `Lic`;
- `Mic` binds committed `Lic` audit truth, reconciles the nine current status
  surfaces, and does not claim a post-`Mic` audit before it exists; and
- an independent committed-byte audit after `Mic` reports
  `0 Blocker / 0 Important` without rewriting `Mic`.

All validation is deny-network and synthetic. No test may resolve the Docker
socket, spawn Docker, create a real `pg` Pool/Client, execute SQL, start a real
macOS helper/provider or access either retained Integration Campaign root.

## Mandatory stop

Successful repository construction stops at:

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_INSPECT_MISSING_CORRECTION_TECHNICAL_REVIEW_GREEN / FRESH_INTEGRATION_CAMPAIGN_V2_EXECUTION_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

A later V2 Card/Review and separate exact Owner approval remain required before
creating a pending grant, reading a Docker socket, calling Docker, cleaning a
resource or entering PostgreSQL.
