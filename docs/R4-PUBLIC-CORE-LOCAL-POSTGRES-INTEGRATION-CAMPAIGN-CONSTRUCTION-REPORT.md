# R4 #67 Local PostgreSQL Integration Campaign — Construction Report

- Status: **`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_CONSTRUCTION_TECHNICAL_REVIEW_GREEN`**
- Date: 2026-08-15
- Scope: repository-only construction under the Owner-approved outcome envelope
- Replacement Diagnostic: **NOT_REQUESTED**
- Historical Cleanup: **NOT_REQUESTED**
- Physical Execution: **NOT_REQUESTED**
- Production: **NOT_REQUESTED**
- Gate C: **NOT_REQUESTED**

## Outcome in plain language

The repository now contains one bounded local campaign runner instead of a
chain of separate diagnostic, cleanup and rehearsal implementations. Under a
later, separately approved one-use Execution Card, that runner can:

1. inspect only the exact historical container, network and volume names and
   keep only body-free classifications and fingerprints;
2. remove a found resource only when both its exact name and frozen historical
   ownership label match;
3. prove all three historical names absent before creating anything new;
4. run the already frozen disposable PostgreSQL rehearsal exactly once; and
5. finish Green with zero owned residue, or stop with exact failed evidence
   that grants no retry.

This report records construction, fake validation and repository evidence. It
does not report a Docker observation or a PostgreSQL rehearsal. The three
historical roots remain unread and unchanged, no campaign grant exists, and no
external effect has been authorized or performed.

## Authority consumed by construction

The Owner approved the outcome envelope and all nine choices in:

| Authority | Committed binding |
|---|---|
| Construction Packet | `sha256:1bfcb75483b359d335812b573b42e3eac0ce669c734295248f2447daf5262d50` at `1f5b9476d891d348161d4a43d918b53873a809e2` / tree `3f42dc6707d2438bd3ad92e17de938210027c80e` |
| Construction Owner Review | `sha256:3ad46ae641bdc1573341ff1221f27589c480b7bad9f4fe41e2a5641758d3296f` at `c15753d299530dfccd027f0ec2a93db77d74a1e9` / tree `228a2ec1b9f771e7bbb747420645a45011865aa3` |

That approval authorized exactly 15 repository paths and three direct,
single-parent commits. It explicitly left replacement diagnostic, cleanup,
Physical Execution, production and Gate C unrequested.

## Exact committed construction

### Ki — implementation and tests

Ki is `76afe10ee53b81f316dbc48bd4e412771e2ae0c7` / tree
`49ab93f6c3ef5b57488d4dda244aad527a9dafd6`, a direct child of the Review.
Its exact delta is `2M / 0A / 0D / 0R`:

| Path | Bytes | SHA-256 |
|---|---:|---|
| `scripts/r4-public-core-local-postgres.mjs` | 716,505 | `sha256:28a278cff09b81585fbbcfef34df932cfb9bb74d541b59925bed69ab93eb6bf8` |
| `test/r4/public-core-local-postgres.test.ts` | 189,073 | `sha256:411e05f7dead430ce980bfd7e6549d628d0fab53123c4fdfc4760aff6f19e4e9` |

The two-blob aggregate is
`sha256:5a8faefbb7e5014e16e786269c5fae36f56b9900e2a162e8a3633e698154eacc`.
Its framing is unsigned UTF-8 path order with
`path NUL sha256:<digest> NUL decimal-byte-count LF`, over committed Git blob
bytes.

### Li — machine evidence

Li is `4c20af20b24f21cce4566ba6c511e5ac39b527df` / tree
`621943118f9f4699b57bed954bfb602cdd125361`, a direct child of Ki. Its exact
delta is `3A / 0M / 0D / 0R`:

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| [artifact index](../schemas/r4/public-core/local-postgres-integration-campaign-artifact-index.json) | 7,206 | `sha256:937a31206a914bbff1203435816fe058653cd225883041a0d56854eba4bf260a` |
| [strict evidence schema](../schemas/r4/public-core/local-postgres-integration-campaign-evidence.schema.json) | 19,529 | `sha256:537598a79c107bb297e3777dbacc2367426470d10baed14d662bbb8ca666d2bb` |
| [machine evidence](./evidence/r4-public-core-local-postgres-integration-campaign.json) | 15,680 | `sha256:526476f0779411f5d4b94c650cbbef2c58a540c773ca7cbd115bde32edd24ea3` |

The three-blob aggregate is
`sha256:6e9c4f9394c70641fd4fb75d378ef75d6f82ccae37c4f7557d5020ac1d3a8868`
under the same framing. The index excludes itself and the Li/Mi evidence
surfaces from G2. The schema permits its own SHA only through a strict digest
pattern, and the evidence contains neither its own SHA nor Li/Mi commit
identities.

Committed audit summaries are:

- Ki: `sha256:c1f5aafb2df9ac07c21fa72f652801f97ba2987d3c52e82d5c312823ef5bab4e`;
- Li: `sha256:9bafd4a36e5261679ba54fb179c68d69bc89ce1283eab4cb2ddbea0811a0dcc1`.

## What the implementation constructs

The runner adds a new, closed Integration Campaign v1 family:

- grant: `r4.public-core-local-postgres-integration-campaign-grant.v1`;
- journal entry:
  `r4.public-core-local-postgres-integration-campaign-journal-entry.v1`;
- receipt:
  `r4.public-core-local-postgres-integration-campaign-receipt.v1`;
- canonical execution authority:
  `r4.public-core-local-postgres-integration-campaign-authority.v1`.

It permanently rejects the consumed physical/rescue grants and the failed V1
diagnostic authority. The future Card/Review must be unique versioned add-only
descendants of final Mi and must bind Ki, Li, Mi, all machine artifacts,
committed audits, the historical resource names and the exact ceilings.

The state machine is:

```text
exact one-use campaign grant
  → body-free exact-name diagnostic
    → MISSING: continue
    → exact OWNED: exact-name cleanup → prove absence
    → FOREIGN / UNLABELLED / MALFORMED / UNKNOWN: stop
  → all three historical names durably absent
  → one frozen disposable PostgreSQL rehearsal
  → exact cleanup
  → GREEN with zero residue, or fail closed without retry
```

Every diagnostic, cleanup and physical call is durably reserved before
invocation. The implementation enforces one campaign consumption, one
diagnostic, at most one historical cleanup, one physical construction, at
most two cleanup-only physical recoveries and at most one anonymous image
pull. Clock rollback, expiry, host drift, an open effect, an exhausted byte or
lifecycle ceiling, duplicate entry or unknown persisted field fails closed.

## Frozen local effect ceiling

The diagnostic/historical-cleanup phase permits only Docker `version=1`, each
exact resource inspect `<=2`, exact-owned container stop/remove `<=1`, and
exact-owned network/volume remove `<=1`. Every image/create/start or unlisted
diagnostic call is zero.

The physical phase preserves the previously frozen V2 maxima: Docker
`version=3`, `image.inspect=2`, `image.pull=1`, `container.inspect=8`,
`container.create=1`, `container.start=2`, `container.stop=4`,
`container.rm=3`, `network.inspect=7`, `network.create=1`, `network.rm=3`,
`volume.inspect=7`, `volume.create=1`, `volume.rm=3`; readiness `60 / 60`;
Pool construction `4 / 124`; connection attempts `124`; concurrency
`1 / 1 / 1`; two run-owned databases; PostgreSQL `160010`; schema
apply/verify/rollback `3 / 3 / 1`; one restart; and domain actions `23 / 20`.

These are future design ceilings, not current permission.

## Validation evidence

All validation used injected fakes or repository reads. The deny-network
wrapper remained active for every behavioral lane.

| Lane | Result |
|---|---:|
| focused campaign + authorized-engine construction | `14 / 14` |
| complete R4 offline regression | `747 / 747` |
| Gate-B Core successor regression | `145 / 145` |
| root spine regression | `45 / 45` |
| strict Ajv 2020 compile + hostile evidence mutations | `PASS / 11 rejected` |
| Node syntax, TypeScript, no-server-AI, inventory, docs and diff checks | `PASS` |

The campaign tests cover all diagnostic classifications, exact-owned cleanup,
absence gating, 48 before/after write-ahead crash cases, expiry and rollback,
host drift, duplicate consumption, journal headroom, two cleanup-only
recoveries with third denial, strict grant/journal/receipt mutations, exact
PostgreSQL sequence and zero final residue. Ordinary and fake tests do not
resolve a real Docker socket, construct a real `pg` Pool or execute SQL.

The legacy aggregate `npm run r4:audit` still rejects the already-existing
`pg` dependency because its historical dependency allowlist predates the
approved Public Core PostgreSQL work. This is a disclosed legacy baseline
incompatibility, not a Ki/Li dependency change: `package.json`,
`package-lock.json`, all three SQL artifacts and the 145-file import closure
are unchanged and independently bound.

## Effect audit

Construction and validation made exactly zero:

- forensic-root reads or mutations;
- pending or consumed campaign grants;
- Docker CLI, socket, daemon, OCI inspect or image-pull calls;
- PostgreSQL processes, connections, databases or SQL statements;
- production database, runtime route, Room, Projection, Curator, Guest,
  provider, model, email, traffic, deployment, publication, admission,
  release or Gate C effects;
- push, PR update, merge or spend.

The Owner-owned `native/macos/.build/` remained out of scope and unread.

## Documentation and evidence chronology

Li truthfully records `operationalCurrentStatusSurfacesCurrent=false` because
the nine current status surfaces were not modified until Mi. This Mi commit
adds this report and reconciles exactly those nine surfaces. It does not claim
that every historical or reference document is current; immutable dated
authority and evidence remain unchanged.

The report contains committed Ki/Li facts. The candidate-Mi latest-byte audit
runs after all ten Mi paths are frozen and is a precommit gate rather than an
embedded self-hash. The committed-Mi audit is necessarily performed after Mi
exists and is kept outside Mi; the later Execution Card may bind that external
audit without creating a self-reference.

## Product meaning and remaining distance

This is a meaningful integration step, but not the product finish line. The
repository now knows how to make one trustworthy local PostgreSQL campaign.
It has not yet observed the target host resources, started PostgreSQL, proved
the catalog on a real server, created a production Room or run the real Guest
encounter.

After one later exact campaign approval, a successful local run can close the
Local PostgreSQL Wiring Technical Review gate. Production activation still
requires Gate C, and #67/R4 still require a real bounded encounter plus Owner
Experience Acceptance.

## Mandatory stop

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_CONSTRUCTION_TECHNICAL_REVIEW_GREEN / ONE_USE_LOCAL_INTEGRATION_CAMPAIGN_EXECUTION_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

The only authorized next repository work is the versioned Integration
Campaign Execution Card/Owner Review after committed-Mi audit. No diagnostic,
cleanup, Physical Execution, production or Gate C action begins from this
report.
