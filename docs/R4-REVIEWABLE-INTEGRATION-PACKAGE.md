# R4 reviewable integration package

Status: repository-only construction Green; the later bounded local campaign
physically proved schema, both verify passes, restart readiness and persistence,
then exhausted its budget at an unidentified rollback guard. See
[`CONTROL.md`](./CONTROL.md) for current operational truth.

## User outcome

Make the current Durable Public Core and disposable PostgreSQL proof reviewable
as one product outcome, without asking the reviewer to reconstruct the historical
one-use authority chain.

## What the restart failure taught us

Run `71ac0e393653db72` proved schema apply and the corrected initial verify, then
failed cleanly after one container stop/start. The old result collapsed every
restart connection failure into `disposable_postgres_readiness_exhausted`,
reported `0` observed restart attempts on failure, and did not re-prove the
container running state or published port after the second start. Its fake test
returned a hard-coded successful attempt count instead of executing the
production readiness controller. The retained evidence therefore cannot tell
whether the container exited, its port changed, connection was transiently
refused, authentication/configuration failed, the readiness query failed, or
the result was malformed.

The repository correction now:

- uses one shared production readiness controller in code and tests;
- preserves every attempted readiness probe even when the gate fails;
- permits retries only for a closed transient-connect class;
- stops immediately and body-free on authentication/configuration, query,
  result, client-close, clock, container-state, or port-binding failure;
- uses a fresh client with readiness-specific 1.5-second query/statement limits;
- bounds the gate to at most 60 attempts and 60 seconds;
- re-inspects the restarted exact-owned container, proves that it is running
  with one loopback-only published port, and uses that freshly observed port
  before another PostgreSQL probe;
- emits result schema `r4.disposable-postgres-rehearsal-result.v2` with exact
  readiness attempt counts and closed outcome classes.

No Docker, socket, PostgreSQL, SQL, provider, Guest, production, public traffic
or Gate C effect was used to construct or validate this correction.

## What the later local campaign proved

The Owner-confirmed campaign subsequently exercised the corrected controller.
Runs `2be1317fe91bd165` and `7dca9ef5bf763039` each applied the exact schema,
passed initial verify, restarted the same container, became ready on the newly
observed loopback port, passed post-restart verify and proved seed persistence.
Every exact-owned resource was then removed. The remaining failure is confined
to a body-free rollback guard `P0001`; its exact predefined guard identifier is
not present in result v2. Three repairs and four lifecycles are consumed, so no
further run is authorized by this package.

## Three review slices

The existing local line is 123 commits and 163 changed paths beyond Draft PR
#76. It contains 99 governance-only commits and 24 commits that touch an
implementation surface. The final integration review should be narrated as
three slices even if they remain one PR:

1. **Product persistence.** The five `apps/room/src/public-core-*` changes, the
   three PostgreSQL SQL artifacts, their application/store/executor/privacy
   tests, and required package bindings. This is the durable product behavior.
2. **Disposable proof.** `scripts/r4-disposable-postgres-rehearsal.mjs`, its one
   focused test, this package, the concise rehearsal result and its machine
   evidence. This is development infrastructure, not product progress.
3. **Operating truth.** The working agreement and the small current-status
   surfaces (`README`, `PRODUCT`, `CONTROL`, `ROADMAP`, `VALIDATION`, project
   metadata). These explain the current gate and review path.

All historical Physical Runner Cards, Addenda, Owner Reviews, construction
reports, artifact indexes and frozen machine-evidence schemas remain immutable
archive evidence. They are not required reading for the current implementation
review and must not be presented as separate active product decisions.

## Constructed local review branch

Local branch `codex/r4-reviewable-integration` is constructed directly above
Draft PR #76 head `c831b4d5253049c4581d3c576aea59648d699d97` as exactly three commits:

1. product persistence `30822612145e46dee6c9210e484abf2715907f3b`;
2. disposable PostgreSQL proof `773ac10b2cd47fb5584a93412cb8bf588e6b3510`;
3. current operating truth `1aa5c18a06a60bd3b3fc1fbac750ee8f75edcc52`.

The branch has no upstream and has not been pushed or merged. An isolated
worktree validation of its own bytes passed the focused disposable proof
`22/22`, product persistence tests `88/88`, spine/Room typecheck and document
audit. The temporary validation worktree was removed afterward.

## Validation

- focused disposable PostgreSQL tests: `22 passed / 0 failed`;
- offline R4 regression: `598 passed / 0 failed / 111 historical physical tests skipped`;
- spine and Room TypeScript checks: Green;
- document audit: Green;
- `git diff --check`: Green.

Runnable repository-only demo:

```sh
node --import ./scripts/deny-external-network.mjs --test test/r4/disposable-postgres-rehearsal.test.ts
```

## What the Owner should challenge

- Are the seven closed readiness outcomes enough to decide the next correction
  without retaining arbitrary Docker or PostgreSQL bodies?
- Is 60 attempts / 60 seconds a reasonable local-development bound?
- Does the final integration PR make the product-persistence slice obvious
  without rewriting immutable history?

Passing these tests is Technical Review only. Restart persistence and
post-restart verify are now physically proved; rollback remains unproved. The
next review target is a strict predefined rollback-assertion diagnostic and a
bounded successor campaign. That continuation does not alter the repository
construction proof in this package.

Historical construction stop:

`POSTGRES_RESTART_READINESS_CONTROLLER_REPOSITORY_GREEN /
REVIEWABLE_INTEGRATION_PACKAGE_READY / PHYSICAL_EXECUTION_NOT_REQUESTED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
