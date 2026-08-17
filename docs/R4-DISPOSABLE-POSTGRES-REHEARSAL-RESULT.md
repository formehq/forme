# R4 disposable PostgreSQL rehearsal result

Status: `IMAGE_ACQUISITION_DECISION_REQUIRED`, 2026-08-17.

## Plain-language result

The strict body-free verify diagnostic is repository Green. It can reveal only
one of the 18 committed `P0001` assertion identifiers, and only when the error
comes from `exec_stmt_raise` during a verify phase. Arbitrary PostgreSQL
messages, SQL, details and data cannot cross the result membrane.

The first approved diagnostic invocation did not reach that code. Docker
`29.3.1 / 29.3.1 / linux/arm64` reported that the exact PostgreSQL image was
not cached. The no-pull rule stopped execution immediately. No container,
network, volume or PostgreSQL connection was created; no schema, verify or
rollback SQL ran; cleanup and the private runtime directory ended absent.

The named verify assertion is therefore still unknown. Repeating the same
command while the cache remains absent would add no evidence, so the second
approved invocation was not used.

## Repository proof

- diagnostic implementation: commit `8f456041b9b98d775acd8bbfe5447b54ebb82ba8`,
  tree `0a26ac1340d83115f913b5357ffcbc97234eb76b`;
- runner SHA-256:
  `ed62e206df9b002ef42922e96d5f363f8cfe8bd35d0bae1f8cd268fd75171c13`;
- test SHA-256:
  `162831e64e5595ff90a6b0775b204d6e911ad06450ed94ab7fd8a7cf53de6f0d`;
- focused rehearsal tests: `11 / 11` Green;
- offline R4 regression: `585 passed / 0 failed / 111` frozen historical
  physical-runner tests skipped;
- spine `45 / 45`, Gate-B Core `146 / 146`, spine/Room typecheck, docs audit
  and `git diff --check`: Green.

## Diagnostic invocation

- run: `1a4475357b9e25c1`;
- time: `2026-08-17T23:47:27.946Z` to `23:47:29.106Z`;
- image pull: `0`;
- Docker resources created: `0`;
- PostgreSQL connections and SQL batches: `0`;
- exact-owned container/network/volume/runtime residue: `0`;
- result: `disposable_postgres_image_not_cached` at
  `docker.image.inspect`.

## What needs review

No verify correction is proposed: the diagnostic did not observe an
assertion. The next decision is whether to authorize one anonymous pull of the
same exact `linux/arm64` digest and then use the remaining bounded diagnostic
and corrected-rehearsal path. Production, real data, push, merge and Gate C
remain closed.

Machine-readable evidence:
[`evidence/r4-disposable-postgres-rehearsal.json`](./evidence/r4-disposable-postgres-rehearsal.json).

Current stop:

`BODY_FREE_VERIFY_DIAGNOSTIC_REPOSITORY_GREEN /
EXACT_IMAGE_CACHE_ABSENT / DIAGNOSTIC_STOPPED_BEFORE_POSTGRES /
VERIFY_ASSERTION_NOT_OBSERVED / IMAGE_ACQUISITION_DECISION_REQUIRED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`.
