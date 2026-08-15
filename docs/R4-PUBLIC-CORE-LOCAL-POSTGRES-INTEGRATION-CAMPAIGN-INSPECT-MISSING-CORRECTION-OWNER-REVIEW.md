# R4 #67 Integration Campaign Inspect-Missing Correction — Owner Review

- Status: **`OWNER_APPROVAL_REQUIRED`**
- Date: 2026-08-15
- Construction effect: repository only
- Docker / cleanup / PostgreSQL / SQL: **NOT_AUTHORIZED**
- Production: **NOT_REQUESTED**
- Gate C: **NOT_REQUESTED**

## What you are deciding

The consumed Integration Campaign V1 failed before PostgreSQL because its
missing-resource parser expected empty stdout. The pinned Docker CLI `v29.3.1`
template inspector deterministically emits one LF when no inspected element
succeeds. The Integration Campaign fake tests injected `MISSING` after parsing
and therefore did not exercise that production frame.

This Review asks for one medium-grained repository correction, not another
Docker call. Approval lets implementation, tests, strict machine evidence,
current-status reconciliation and the exact three commits proceed without
intermediate approvals. It does not authorize a replacement campaign.

The complete proposal is the
[Integration Campaign Inspect-Missing Correction Addendum](./R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-INSPECT-MISSING-CORRECTION-ADDENDUM.md).

## Exact proposal binding

| Binding | Exact value |
|---|---|
| correction Addendum SHA | `sha256:a43fbb5ac8e795ab6b6bf51507d3489c9e803161419af50179d7f7e9bed97505` |
| Addendum commit HEAD / tree | `15536817efe6b0b7a5c8014e912f02429f197ef1` / `503c9432fd2b75fd16857afe58c2eb78a24581da` |
| Addendum parent baseline HEAD / tree | `542a533b2b642e6a26f8923649ecfb4de9b6e58e` / `30a97caffc0b54693a87065e8e0ca5a7b5b322bf` |
| Addendum delta | exactly one added mode-`100644` document |
| failed terminal evidence | `sha256:be312a188ec955f43bb2cb22bd276f1782ceaaa89da0d5c79d582d8f597c0501` / `6599` bytes |
| consumed campaign grant | `sha256:7fdf12a2f7bd195ef07218e724f45708ec0cac93c1175605668678df7c236e81` |
| failed journal | `7` / `sha256:5f22912b70c2b4bf5f9e4007afb27763931d5c158e41a4eebb7f543bf4208a04` |
| pinned Docker source | tag commit `c2be9ccfc3cf0b4c4c4f0a3d5c91dd759ab21256`; inspector blob `526cfda9f8c0cf6135baef50ff4ce357b342d6b0`; bytes `sha256:e4409bad908d89c0c5eaae64342b2dbb305b7b7ca5cd693bc7e7e0dd54167c1a` |

The Addendum is a direct child of the failed Campaign V1 Review and adds no
runner, test, schema, dependency, effect authority or status claim.

## Nine choices

Please accept or reject these as one decision:

1. recognize missing only from the exact pinned completed/status-1/one-LF
   stdout plus exact resource-name stderr frame;
2. correct image, container, network and volume template inspect together;
3. make fake and production campaign diagnostics use one raw-result parser;
4. retain only closed body-free fingerprints and zero raw buffers;
5. keep any mismatch or ambiguity as `UNKNOWN`, stopping before cleanup and
   physical construction;
6. introduce a truthful versioned receipt in which unknown residue is not
   encoded as an observed numeric count;
7. preserve every existing PostgreSQL, write-ahead, no-retry and exact-cleanup
   ceiling;
8. reserve fresh versioned V2 Card/Review paths and a fresh root/grant for any
   later effect proposal; and
9. keep Docker, cleanup, PostgreSQL, production, real Guest, Provider and Gate C
   effects at zero throughout correction construction.

## Exact construction envelope

Approval authorizes exactly `Kic → Lic → Mic` as three direct single-parent
commits:

- `Kic`: two modified paths — runner and its focused test;
- `Lic`: three added correction artifact paths — index, strict evidence schema
  and machine evidence;
- `Mic`: one added construction report plus nine modified current-status
  surfaces.

Total: **15 paths = 11 modified + 4 added**. No dependency, SQL, product API,
production schema, network authority, mode, historical root or sixteenth path
may change. All test execution is synthetic, deny-network and Docker/PG-free.

## What approval does not do

Approval does not:

- retry or reinterpret Campaign V1;
- read, modify or clean either retained campaign root;
- prepare or consume a V2 grant;
- call the Docker CLI, socket or daemon;
- inspect, stop or remove any Docker object;
- pull an image, start PostgreSQL, connect a Pool, run SQL or exercise a domain
  action;
- activate production, publish, admit a Guest, send a message, deploy, merge,
  release, spend or enter Gate C.

## Approval mechanics

An exact approval must bind:

1. the Addendum SHA and Addendum HEAD/tree above;
2. this Review's externally computed committed blob SHA and direct-child
   Review HEAD/tree;
3. all nine choices and the exact 15-path / three-commit envelope; and
4. the zero-effect boundary and mandatory stop below.

The Review intentionally contains neither its own SHA nor its future commit
HEAD/tree. Those values must be computed from the committed blob and supplied
externally, avoiding self-reference.

## Mandatory stop

After exact approval and successful committed construction/audit:

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_INSPECT_MISSING_CORRECTION_TECHNICAL_REVIEW_GREEN / FRESH_INTEGRATION_CAMPAIGN_V2_EXECUTION_APPROVAL_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

Any out-of-envelope path, dynamic missing inference, raw body retention,
validation ambiguity or requested external effect stops earlier and returns to
the Owner.
