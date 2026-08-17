# R4 #67 Integration Campaign V4 Outcome

Status: `FAILED_CLEAN_LOCAL_LIFECYCLE_BUDGET_EXHAUSTED`

Date: 2026-08-17

## Outcome

Integration Campaign V4 was prepared once and its one-use grant was consumed
once. It advanced beyond the corrected historical container inspection and
then failed closed on a distinct, previously unadmitted body-free historical
`network.inspect` missing-object fingerprint. It did not reach image use,
fresh construction, PostgreSQL or SQL. There is no retry authority and the
confirmed three-lifecycle local advancement budget is exhausted.

## Exact authority and terminal evidence

| Binding | Exact value |
|---|---|
| Card SHA / HEAD / tree | `sha256:f867ee4fc7ede804d45913b4a8afe28bce7b0510c82dd19dd620715b51c777ec` / `25abdcfa5d30cf642ec79584463d76a211a116d1` / `fa857aee12339741e12c1e05f169153b85b1c18e` |
| Review SHA / HEAD / tree | `sha256:a3bf61dd54aafe999ee9c0056a6e35a78c8d36e263a054985c5e63e02351f29f` / `a8f0b34a6a39cab626baa63adc4d709181043472` / `e5236f256ba49a072869bbf8a1aebbb5fe3e3fd4` |
| canonical payload | `sha256:780a4afc94fb32f4748354519e88bb0528d544ce1d2b78c5d9b4a7015601f859` / `9819` bytes |
| root | `/Users/zaynw/.forme-r4-integration-campaign-v4-f867ee4f` |
| Owner receipt | `sha256:cb9398184a9d95ca59ec1e82a4248afb4b3c8f85b9c52173a17a9aaf526f52cd` / `1223` bytes |
| consumed grant | `sha256:544f8036b712b1766805fc795fe737ce630c36ee1db4b8091ab538c4c876d517` / `10820` bytes |
| terminal evidence | `sha256:fb44fbd9bbbd0b39f31beff266f4a6795ac4ccc74946d3543a88bf0a8ee1166b` / `11949` bytes |
| journal | `12` entries / `sha256:df1e0c8cd7dec7cc1f02748395e41f8890fb250de7d1bc21d6a6069455b7d60f` / `0` open effects |

The receipt status is `FAILED`, code
`local_postgres_integration_campaign_failed`; the public CLI error was
`local_postgres_docker_call_failed`.

## Body-free observations

1. Docker `version` completed and matched `29.3.1 / 29.3.1 / linux/arm64`.
2. Historical `container.inspect` ordinal 1 completed exit `1` and matched the
   newly authorized missing fingerprint exactly:
   stdout `1` byte / one `LF` /
   `sha256:01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b`;
   stderr `105` bytes / one `LF` /
   `sha256:36557984fb7353759773898446bc48f3ccc9ad3489f53f5b52ee2c7b3cdf83f3`.
3. Historical `network.inspect` ordinal 1 completed exit `1` but remained
   `UNKNOWN`: stdout `1` byte / one `LF` /
   `sha256:01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b`;
   stderr `108` bytes / one `LF` /
   `sha256:d746c7e623df324cd3ef6ce071393d7c166c3273ca0b69f3c69408b713064616`.

No output body was admitted or persisted. The network tuple is evidence for a
future correction decision, not present authority to classify or retry it.

## Cleanup and effect truth

- fresh container/network/volume: `PROVEN_ABSENT`;
- historical container: `PROVEN_ABSENT`;
- historical network/volume: `UNKNOWN`;
- owned credential, Docker-config, imported-runtime and active-coordinator
  residue: all `0`;
- diagnostic Docker attempts/completions: version `1/1`, container inspect
  `1/1`, network inspect `1/1`, all other command kinds `0/0`;
- physical rehearsal attempt/completion: `0/0`;
- PostgreSQL, SQL, product runtime, production, publication, Provider,
  external message, spend and Gate C effects: `0`.

The root retains exactly the consumed grant, terminal evidence, twelve-entry
journal directory and Owner receipt. No cleanup retry or foreign-resource
action is required or authorized.

## Product meaning and stop

This is useful infrastructure evidence: Docker and the corrected container
fingerprint are now proven on the current host, and fail-closed cleanup worked.
It is not the local PostgreSQL rehearsal and not the Public Room encounter.
Progress toward MVP Vision remains blocked before local persistence by one
more exact historical network/volume absence classification decision and a new
explicit lifecycle budget.

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_V4_FAILED_CLEAN /
LOCAL_LIFECYCLE_BUDGET_EXHAUSTED / NEW_OWNER_DECISION_REQUIRED /
PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`
